import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import { expect, use as chaiUse } from "chai";
import request = require("supertest");
import twilio = require("twilio");
import "../../lib/twilioAugments";
import lib from "../../lib/";
import { values as objectValues } from "../../lib/util/objectValuesEntries";

import {
  RoutableState, BranchingState, NormalState, AsynchronousState,
  EndState, UsableState, urlFor
} from "../../lib/state";

chaiUse(sinonChai);


let states: any = {
  routableBranching: <RoutableState & BranchingState>{
    name: "CALL_RECEIVED_BRANCH",
    uri: "/routable-branching",
    transitionOut: (<sinon.SinonSpy>((input?: twilio.CallDataTwiml) => {
      return input && input.CallerZip == "00000" ?
        states.nonRoutableBranching :
        states.routableEnd;
    }))
  },

  routableNormal: <RoutableState & NormalState>{
    name: "CALL_RECEIVED_RENDER",
    uri: "/routable-normal",
    processTransitionUri: "/process-renderable-entry",
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "input to routableNormal was: " + JSON.stringify(input);
    },
    transitionOut(input?: twilio.CallDataTwiml) {
      return Promise.resolve(states.nonRoutableNormal);
    }
  },

  routableEnd: <RoutableState & EndState>{
    name: "CALL_RECEIVED_END",
    uri: "/routable-end",
    isEndState: true,
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "Sorry, no one home. Bye.";
    }
  },

  routableAsync: <RoutableState & AsynchronousState>{
    name: "CALL_RECEIVED_ASYNC",
    uri: "/routable-async",
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "Sorry, no one home. Bye.";
    },
    backgroundTrigger() { return "do some effect..."; }
  },

  nonRoutableBranching: <BranchingState>{
    name: "INNER_BRANCH",
    transitionOut: (<sinon.SinonSpy>((input?: twilio.CallDataTwiml) => {
      return states.nonRoutableNormal;
    }))
  },

  nonRoutableNormal: <NormalState>{
    name: "INNER_RENDER",
    processTransitionUri: "/process-inner-renderable",
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "input to nonRoutableNormal was: " + JSON.stringify(input);
    },
    transitionOut(input?: twilio.CallDataTwiml) {
      return Promise.resolve(states.routableEnd);
    }
  }
}

let appConfig = { twilio: { authToken: "", validate: false } };
let app = lib(objectValues<UsableState>(states), appConfig);
let agent = request(app);

describe("state routing & rendering", () => {
  describe("routable states", () => {
    describe("branching (non-renderable) routable states", () => {
      let spiedOn = [
        states.routableBranching,
        states.routableEnd,
        states.nonRoutableBranching,
        states.nonRoutableNormal
      ];

      let branchingRoutableRequestWithZip = agent
        .post("/routable-branching")
        .type("form")
        .send({CallerZip: "00000"});

      before(() => {
        spyOn(spiedOn)
      });

      after(() => {
        unSpyOn(spiedOn);
      });

      it("should render the first renderable state", () => {
        return branchingRoutableRequestWithZip
          .expect("input to nonRoutableNormal was: undefined");
      });

      it("should pass input to the first transitionOut, but not subsequent ones", () => {
        return branchingRoutableRequestWithZip
         .then(() => {
           expect(states.routableBranching.transitionOut)
             .calledWithExactly({CallerZip: "00000"});

           expect(states.nonRoutableBranching.transitionOut)
             .calledWithExactly(undefined);
         });
      });

      it("should not pass input to the ultimate twimlFor", () => {
        return branchingRoutableRequestWithZip
         .then(() => {
           expect(states.nonRoutableNormal.twimlFor)
             .calledWithExactly(sinon.match.func, undefined);
         });
      });

      it("should not matter if the first renderable state is also routable or an end state", () => {
        let branchingRoutableRequestWithoutZip =
          agent
            .post("/routable-branching")
            .type("form")
            .send({CallerZip: ""});

        return branchingRoutableRequestWithoutZip
          .expect("Sorry, no one home. Bye.")
          .then(() => {
            expect(states.routableBranching.transitionOut)
              .calledWithExactly({CallerZip: ""});

            expect(states.routableEnd.twimlFor)
              .calledWithExactly(sinon.match.func, undefined);
          });
      });
    });

    describe("renderable states", () => {
      let spiedOn = [
        states.routableNormal, states.routableAsync
      ];

      before(() => {
        spyOn(spiedOn);
      });

      after(() => {
        unSpyOn(spiedOn);
      });

      it("should render state and pass the post data to twimlFor", () => {
        let dummyData = {To: "+18005555555"};
        return agent
          .post("/routable-normal")
          .type("form")
          .send(dummyData)
          .expect('input to routableNormal was: {"To":"+18005555555"}');
      });

      describe("asynchronous states", () => {
        let asyncRoutableRequest: request.Test;

        before(() => {
          asyncRoutableRequest = agent
            .post("/routable-async")
            .type("form")
            .send({"Test": true});
        });

        it("should call backgroundTrigger just before rendering", () => {
          return asyncRoutableRequest
            .then(() => {
              expect(states.routableAsync.backgroundTrigger)
                .calledBefore(states.routableAsync.twimlFor);
            });
        });

        it("should call backgroundTrigger with the POST data", () => {
          return asyncRoutableRequest
            .then(() => {
              expect(states.routableAsync.backgroundTrigger)
                .calledBefore(states.routableAsync.twimlFor);

              // Below, we quote "true" in recognition of the fact that
              // all data is converted to strings as part of POSTing it.
              expect(states.routableAsync.backgroundTrigger)
                .calledWithExactly(sinon.match.func, {"Test": "true"});
            });
        });
      });
    });
  });

  describe("processing input from prior states", () => {

  });
});


function spyOn(toSpyOn: any[]) {
  let methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
  toSpyOn.forEach(it => {
    methods.forEach(method => {
      if(it[method]) { sinon.spy(it, method); }
    });
  });
}

function unSpyOn(toSpyOn: any[]) {
  let methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
  toSpyOn.forEach(it => {
    methods.forEach(method => {
      if(it[method]) { it[method].restore(); }
    });
  });
}
