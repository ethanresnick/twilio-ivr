"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const chai_1 = require("chai");
require("../../../lib/twilioAugments");
const sut = require("../../../lib/util/routeCreationHelpers");
const states = require("../../fixtures/states");
chai_1.use(sinonChai);
describe("route creation utilities", () => {
    describe("resolveBranches", () => {
        describe("handling renderable input states", () => {
            it("should return a promise for the input state", () => {
                const results = states.renderableStates.map(state => [state, sut.resolveBranches(state, {})]);
                const assertions = results.map(([state, resultPromise]) => {
                    return resultPromise.then((resolvedState) => {
                        chai_1.expect(state).to.equal(resolvedState);
                    });
                });
                return Promise.all(assertions);
            });
        });
        describe("handling branching, non-renderable states", () => {
            const g = {
                name: "g",
                processTransitionUri: "/whatevs",
                twimlFor: () => "",
                transitionOut: ((input) => Promise.resolve(undefined))
            };
            const h = {
                name: "h",
                transitionOut: ((input) => Promise.resolve(g))
            };
            const i = {
                name: "i",
                transitionOut: ((input) => Promise.resolve(h)),
            };
            beforeEach(function () {
                [g, h, i].forEach(it => sinon.spy(it, "transitionOut"));
            });
            afterEach(() => {
                [g, h, i].forEach(it => { it.transitionOut.restore(); });
            });
            it("should pass any input data to the first non-renderable state, but not subsequent ones", () => {
                return sut.resolveBranches(i, {}).then(state => {
                    chai_1.expect(i.transitionOut).calledWithExactly({});
                    chai_1.expect(h.transitionOut).calledWithExactly(undefined);
                });
            });
            it("should finally return a promise for the first renderable state", () => {
                return sut.resolveBranches(i, {}).then(state => {
                    chai_1.expect(state.name).to.equal("g");
                });
            });
            it("should not call transition out on the renderable state, once found", () => {
                return sut.resolveBranches(i, {}).then(state => {
                    chai_1.expect(g.transitionOut).to.not.have.been.called;
                });
            });
        });
    });
    describe("renderState", () => { });
});
