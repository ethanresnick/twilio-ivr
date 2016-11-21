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
      return "input to routableNormal was: " + String(input);
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
    backgroundTrigger() { return "we'll put a testdouble here."; }
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
      return "input to nonRoutableNormal was: " + String(input);
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
  let transitionOutSpiedOn = [
    states.routableBranching,
    states.nonRoutableBranching
  ];

  beforeEach(() => {
    transitionOutSpiedOn.forEach(it => sinon.spy(it, "transitionOut"));
  });

  afterEach(() => {
    transitionOutSpiedOn.forEach(it => it.transitionOut.restore());
  });

  describe("routable states", () => {
    describe("branching (non-renderable) routable states", () => {
      it("should render the first renderable state", () => {
        return agent
         .post("/routable-branching")
         .type("form")
         .send({CallerZip: "00000"})
         .expect("input to nonRoutableNormal was: undefined");
      });

      it("should pass input to the first transitionOut, but not subsequent ones", () => {
        return agent
         .post("/routable-branching")
         .type("form")
         .send({CallerZip: "00000"})
         .then(() => {
           expect(states.routableBranching.transitionOut).calledWithExactly({CallerZip: "00000"});
           expect(states.nonRoutableBranching.transitionOut).calledWithExactly(undefined);
         });
      });
    });
  });
});
