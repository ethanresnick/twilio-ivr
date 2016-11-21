"use strict";
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai_1 = require("chai");
const request = require("supertest");
require("../../lib/twilioAugments");
const _1 = require("../../lib/");
const objectValuesEntries_1 = require("../../lib/util/objectValuesEntries");
chai_1.use(sinonChai);
let states = {
    routableBranching: {
        name: "CALL_RECEIVED_BRANCH",
        uri: "/routable-branching",
        transitionOut: ((input) => {
            return input && input.CallerZip == "00000" ?
                states.nonRoutableBranching :
                states.routableEnd;
        })
    },
    routableNormal: {
        name: "CALL_RECEIVED_RENDER",
        uri: "/routable-normal",
        processTransitionUri: "/process-renderable-entry",
        twimlFor(urlFor, input) {
            return "input to routableNormal was: " + String(input);
        },
        transitionOut(input) {
            return Promise.resolve(states.nonRoutableNormal);
        }
    },
    routableEnd: {
        name: "CALL_RECEIVED_END",
        uri: "/routable-end",
        isEndState: true,
        twimlFor(urlFor, input) {
            return "Sorry, no one home. Bye.";
        }
    },
    routableAsync: {
        name: "CALL_RECEIVED_ASYNC",
        uri: "/routable-async",
        twimlFor(urlFor, input) {
            return "Sorry, no one home. Bye.";
        },
        backgroundTrigger() { return "we'll put a testdouble here."; }
    },
    nonRoutableBranching: {
        name: "INNER_BRANCH",
        transitionOut: ((input) => {
            return states.nonRoutableNormal;
        })
    },
    nonRoutableNormal: {
        name: "INNER_RENDER",
        processTransitionUri: "/process-inner-renderable",
        twimlFor(urlFor, input) {
            return "input to nonRoutableNormal was: " + String(input);
        },
        transitionOut(input) {
            return Promise.resolve(states.routableEnd);
        }
    }
};
let appConfig = { twilio: { authToken: "", validate: false } };
let app = _1.default(objectValuesEntries_1.values(states), appConfig);
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
                    .send({ CallerZip: "00000" })
                    .expect("input to nonRoutableNormal was: undefined");
            });
            it("should pass input to the first transitionOut, but not subsequent ones", () => {
                return agent
                    .post("/routable-branching")
                    .type("form")
                    .send({ CallerZip: "00000" })
                    .then(() => {
                    chai_1.expect(states.routableBranching.transitionOut).calledWithExactly({ CallerZip: "00000" });
                    chai_1.expect(states.nonRoutableBranching.transitionOut).calledWithExactly(undefined);
                });
            });
        });
    });
});
