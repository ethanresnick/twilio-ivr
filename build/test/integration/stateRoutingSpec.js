"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai_1 = require("chai");
const request = require("supertest");
require("../../lib/twilioAugments");
const _1 = require("../../lib/");
const objectValuesEntries_1 = require("../../lib/util/objectValuesEntries");
chai_1.use(sinonChai);
const states = {
    routableBranching: {
        name: "CALL_RECEIVED_BRANCH",
        uri: "/routable-branching",
        transitionOut: ((req, input) => {
            return input && input.CallerZip === "00000" ?
                states.nonRoutableBranching :
                states.routableEnd;
        })
    },
    routableNormal: {
        name: "CALL_RECEIVED_RENDER",
        uri: "/routable-normal",
        processTransitionUri: "/process-renderable-entry",
        twimlFor(urlFor, req, input) {
            return "input to routableNormal was: " + JSON.stringify(input);
        },
        transitionOut(req, input) {
            return Promise.resolve(states.nonRoutableNormal);
        }
    },
    routableEnd: {
        name: "CALL_RECEIVED_END",
        uri: "/routable-end",
        isEndState: true,
        twimlFor(urlFor, req, input) {
            return "Sorry, no one home. Bye.";
        }
    },
    routableAsync: {
        name: "CALL_RECEIVED_ASYNC",
        uri: "/routable-async",
        twimlFor(urlFor, req, input) {
            return "We're doing something...";
        },
        backgroundTrigger() { return "do some effect..."; }
    },
    nonRoutableBranching: {
        name: "INNER_BRANCH",
        transitionOut: ((req, input) => {
            return states.nonRoutableNormal;
        })
    },
    nonRoutableBranching2: {
        name: "INNER_BRANCH_2",
        transitionOut: ((req, input) => {
            return Promise.resolve(states.routableAsync);
        })
    },
    nonRoutableNormal: {
        name: "INNER_RENDER",
        processTransitionUri: "/process-inner-renderable",
        twimlFor(urlFor, req, input) {
            return "input to nonRoutableNormal was: " + JSON.stringify(input);
        },
        transitionOut(req, input) {
            return Promise.resolve(states.nonRoutableBranching2);
        }
    }
};
const appConfig = { twilio: { authToken: "", validate: false }, session: { secret: 'fuck' } };
const app = _1.default(objectValuesEntries_1.values(states), appConfig);
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
                spyOn(spiedOn);
            });
            afterEach(() => {
                unSpyOn(spiedOn);
            });
            it("should render the first renderable state", () => {
                return requestApp
                    .post("/routable-branching")
                    .type("form")
                    .send({ CallerZip: "00000" })
                    .expect("input to nonRoutableNormal was: undefined");
            });
            it("should pass input to the first transitionOut, but not subsequent ones", () => {
                return requestApp
                    .post("/routable-branching")
                    .type("form")
                    .send({ CallerZip: "00000" })
                    .then(() => {
                    chai_1.expect(states.routableBranching.transitionOut)
                        .calledWithExactly(sinon.match.any, { CallerZip: "00000" });
                    chai_1.expect(states.nonRoutableBranching.transitionOut)
                        .calledWithExactly(sinon.match.any, undefined);
                });
            });
            it("should not pass input to the ultimate twimlFor", () => {
                return requestApp
                    .post("/routable-branching")
                    .type("form")
                    .send({ CallerZip: "00000" })
                    .then(() => {
                    chai_1.expect(states.nonRoutableNormal.twimlFor)
                        .calledWithExactly(sinon.match.func, sinon.match.any, undefined);
                });
            });
            it("should not matter if the first renderable state is also routable or an end state", () => {
                return requestApp
                    .post("/routable-branching")
                    .type("form")
                    .send({ CallerZip: "" })
                    .expect("Sorry, no one home. Bye.")
                    .then(() => {
                    chai_1.expect(states.routableBranching.transitionOut)
                        .calledWithExactly(sinon.match.any, { CallerZip: "" });
                    chai_1.expect(states.routableEnd.twimlFor)
                        .calledWithExactly(sinon.match.func, sinon.match.any, undefined);
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
                const dummyData = { To: "+18005555555" };
                return requestApp
                    .post("/routable-normal")
                    .type("form")
                    .send(dummyData)
                    .expect('input to routableNormal was: {"To":"+18005555555"}');
            });
            describe("asynchronous states", () => {
                let asyncRoutableRequest;
                before(() => {
                    asyncRoutableRequest = requestApp
                        .post("/routable-async")
                        .type("form")
                        .send({ "Test": true });
                });
                it("should call backgroundTrigger just before rendering", () => {
                    return asyncRoutableRequest
                        .then(() => {
                        chai_1.expect(states.routableAsync.backgroundTrigger)
                            .calledBefore(states.routableAsync.twimlFor);
                    });
                });
                it("should call backgroundTrigger with the POST data", () => {
                    return asyncRoutableRequest
                        .then(() => {
                        chai_1.expect(states.routableAsync.backgroundTrigger)
                            .calledBefore(states.routableAsync.twimlFor);
                        chai_1.expect(states.routableAsync.backgroundTrigger)
                            .calledWithExactly(sinon.match.func, sinon.match.any, { "Test": "true" });
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
        const dummyData = { Dummy: "Data" };
        beforeEach(() => {
            spyOn(spiedOn);
        });
        afterEach(() => {
            unSpyOn(spiedOn);
        });
        it("should pass user input to the state being transitioned out of", () => {
            return requestApp
                .post(states.routableNormal.processTransitionUri)
                .type("form")
                .send(dummyData)
                .then(() => {
                chai_1.expect(states.routableNormal.transitionOut)
                    .calledWithExactly(sinon.match.any, dummyData);
            });
        });
        it("should not call transitionOut if the next state's already renderable", () => {
            return requestApp
                .post(states.routableNormal.processTransitionUri)
                .type("form")
                .send(dummyData)
                .then(() => {
                chai_1.expect(states.nonRoutableNormal.transitionOut).to.not.have.been.called;
            });
        });
    });
});
function spyOn(toSpyOn) {
    const methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
    toSpyOn.forEach(it => {
        methods.forEach(method => {
            if (it[method]) {
                sinon.spy(it, method);
            }
        });
    });
}
function unSpyOn(toUnSpyOn) {
    const methods = ["transitionOut", "backgroundTrigger", "twimlFor"];
    toUnSpyOn.forEach(it => {
        methods.forEach(method => {
            if (it[method]) {
                it[method].restore();
            }
        });
    });
}
