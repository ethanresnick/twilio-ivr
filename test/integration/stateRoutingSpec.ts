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

type statesToTest = {
  routableBranching: RoutableState & BranchingState,
  routableNormal: RoutableState & NormalState,
  routableEnd: RoutableState & EndState,
  routableAsync: RoutableState & AsynchronousState,
  nonRoutableBranching: BranchingState,
  nonRoutableBranching2: BranchingState,
  nonRoutableNormal: NormalState
};

const states: statesToTest = {
  routableBranching: {
    name: "CALL_RECEIVED_BRANCH",
    uri: "/routable-branching",
    transitionOut: (<sinon.SinonSpy>((input?: twilio.CallDataTwiml) => {
      return input && input.CallerZip === "00000" ?
        states.nonRoutableBranching :
        states.routableEnd;
    }))
  },

  routableNormal: {
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

  routableEnd: {
    name: "CALL_RECEIVED_END",
    uri: "/routable-end",
    isEndState: true,
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "Sorry, no one home. Bye.";
    }
  },

  routableAsync: {
    name: "CALL_RECEIVED_ASYNC",
    uri: "/routable-async",
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "We're doing something...";
    },
    backgroundTrigger() { return "do some effect..."; }
  },

  nonRoutableBranching: {
    name: "INNER_BRANCH",
    transitionOut: (<sinon.SinonSpy>((input?: twilio.CallDataTwiml) => {
      return states.nonRoutableNormal;
    }))
  },

  nonRoutableBranching2: {
    name: "INNER_BRANCH_2",
    transitionOut: (<sinon.SinonSpy>((input?: twilio.CallDataTwiml) => {
      return Promise.resolve(states.routableAsync);
    }))
  },

  nonRoutableNormal: {
    name: "INNER_RENDER",
    processTransitionUri: "/process-inner-renderable",
    twimlFor(urlFor: urlFor, input?: twilio.CallDataTwiml) {
      return "input to nonRoutableNormal was: " + JSON.stringify(input);
    },
    transitionOut(input?: twilio.CallDataTwiml) {
      return Promise.resolve(states.nonRoutableBranching2);
    }
  }
}

const appConfig = { twilio: { authToken: "", validate: false } };
const app = lib(objectValues<UsableState>(states), appConfig);
const requestApp = request(app);

describe("state routing & rendering", () => {
  describe("routable states", () => {
    describe("branching (non-renderable) routable states", () => {
      const spiedOn = [
        states.routableBranching,
        states.routableEnd,
        states.nonRoutableBranching,
        states.nonRoutableNormal
      ];

      beforeEach(() => {
        spyOn(spiedOn)
      });

      afterEach(() => {
        unSpyOn(spiedOn);
      });

      it("should render the first renderable state", () => {
        return requestApp
          .post("/routable-branching")
          .type("form")
          .send({CallerZip: "00000"})
          .expect("input to nonRoutableNormal was: undefined");
      });

      it("should pass input to the first transitionOut, but not subsequent ones", () => {
        return requestApp
          .post("/routable-branching")
          .type("form")
          .send({CallerZip: "00000"})
          .then(() => {
            //tslint:disable-next-line:no-unbound-method
            expect(states.routableBranching.transitionOut)
              .calledWithExactly({CallerZip: "00000"});

            //tslint:disable-next-line:no-unbound-method
            expect(states.nonRoutableBranching.transitionOut)
              .calledWithExactly(undefined);
          });
      });

      it("should not pass input to the ultimate twimlFor", () => {
        return requestApp
          .post("/routable-branching")
          .type("form")
          .send({CallerZip: "00000"})
          .then(() => {
            //tslint:disable-next-line:no-unbound-method
            expect(states.nonRoutableNormal.twimlFor)
              .calledWithExactly(sinon.match.func, undefined);
          });
      });

      it("should not matter if the first renderable state is also routable or an end state", () => {
        return requestApp
          .post("/routable-branching")
          .type("form")
          .send({CallerZip: ""})
          .expect("Sorry, no one home. Bye.")
          .then(() => {
            //tslint:disable-next-line:no-unbound-method
            expect(states.routableBranching.transitionOut)
              .calledWithExactly({CallerZip: ""});

            //tslint:disable-next-line:no-unbound-method
            expect(states.routableEnd.twimlFor)
              .calledWithExactly(sinon.match.func, undefined);
          });
      });
    });

    describe("renderable states", () => {
      const spiedOn = [
        states.routableNormal, states.routableAsync
      ];

      before(() => {
        spyOn(spiedOn);
      });

      after(() => {
        unSpyOn(spiedOn);
      });

      it("should render state and pass the post data to twimlFor", () => {
        const dummyData = {To: "+18005555555"};
        return requestApp
          .post("/routable-normal")
          .type("form")
          .send(dummyData)
          .expect('input to routableNormal was: {"To":"+18005555555"}');
      });

      describe("asynchronous states", () => {
        let asyncRoutableRequest: request.Test;

        before(() => {
          asyncRoutableRequest = requestApp
            .post("/routable-async")
            .type("form")
            .send({"Test": true});
        });

        it("should call backgroundTrigger just before rendering", () => {
          return asyncRoutableRequest
            .then(() => {
              //tslint:disable-next-line:no-unbound-method
              expect(states.routableAsync.backgroundTrigger)
                .calledBefore(<sinon.SinonSpy>states.routableAsync.twimlFor); // tslint:disable-line:no-unbound-method
            });
        });

        it("should call backgroundTrigger with the POST data", () => {
          return asyncRoutableRequest
            .then(() => {
              //tslint:disable-next-line:no-unbound-method
              expect(states.routableAsync.backgroundTrigger)
                .calledBefore(<sinon.SinonSpy>states.routableAsync.twimlFor); // tslint:disable-line:no-unbound-method

              // Below, we quote "true" in recognition of the fact that
              // all data is converted to strings as part of POSTing it.
              //tslint:disable-next-line:no-unbound-method
              expect(states.routableAsync.backgroundTrigger)
                .calledWithExactly(sinon.match.func, {"Test": "true"});
            });
        });
      });
    });
  });

  describe("processing input from prior states", () => {
      const spiedOn = [
        states.routableNormal,
        states.nonRoutableNormal,
        states.nonRoutableBranching2,
        states.routableAsync
      ];

      const dummyData = {Dummy: "Data"};

      beforeEach(() => {
        spyOn(spiedOn)
      });

      afterEach(() => {
        unSpyOn(spiedOn);
      });

    // try processTransitionOut uri on the routable and nonRoutable normal states.
    it("should pass user input to the state being transitioned out of", () => {
      return requestApp
        .post(states.routableNormal.processTransitionUri)
        .type("form")
        .send(dummyData)
        .then(() => {
          //tslint:disable-next-line:no-unbound-method
          expect(states.routableNormal.transitionOut)
            .calledWithExactly(dummyData);
        });
    });

    it("should find the next renderable state, branching without passing along input", () => {
      return requestApp
        .post(states.nonRoutableNormal.processTransitionUri)
        .type("form")
        .send(dummyData)
        .then(() => {
          //tslint:disable-next-line:no-unbound-method
          expect(states.nonRoutableBranching2.transitionOut)
            .calledWithExactly(undefined);
        });
    });

    it("should not call transitionOut if the next state's already renderable", () => {
      return requestApp
        .post(states.routableNormal.processTransitionUri)
        .type("form")
        .send(dummyData)
        .then(() => {
          //tslint:disable-next-line:no-unbound-method
          expect(states.nonRoutableNormal.transitionOut).callCount(0);
        });
    });

    it("should render the next state, with no input provided, calling bgTrigger if relevant", () => {
      return Promise.all([
        requestApp
          .post(states.routableNormal.processTransitionUri)
          .type("form")
          .send(dummyData)
          .expect("input to nonRoutableNormal was: undefined"),

        requestApp
          .post(states.nonRoutableNormal.processTransitionUri)
          .type("form")
          .send(dummyData)
          .expect("We're doing something...")
          .then(() => {
            //tslint:disable-next-line:no-unbound-method
            expect(states.routableAsync.twimlFor)
              .calledWithExactly(sinon.match.func, undefined);
          })
      ]);
    });
  });
});

/**
 * Takes an array of states and replaces their transitionOut, backgroundTwiml,
 * and twimlFor methods (for each of those methods that exists) with sinon spies
 * for those methods.
 * @param {any[]} toSpyOn An array of states.
 */
function spyOn(toSpyOn: any[]) {
  const methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
  toSpyOn.forEach(it => {
    methods.forEach(method => {
      if(it[method]) { sinon.spy(it, method); }
    });
  });
}

/**
 * Takes an array of states whose transitionOut, backgroundTwiml, and/or twimlFor
 * methods have been replaced with sinon spies and restores the original methods.
 * @param {any[]} toUnSpyOn An array of states.
 */
function unSpyOn(toUnSpyOn: any[]) {
  const methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
  toUnSpyOn.forEach(it => {
    methods.forEach(method => {
      if(it[method]) { it[method].restore(); }
    });
  });
}
