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
    describe("urlFor", () => {
        const urlFor = sut.makeUrlFor("ftp", "localhost", (it) => it + '?v=1');
        it("should reject an attempt to fingerprint a uri with a query parameter", () => {
            chai_1.expect(() => {
                urlFor('/static/test', { query: { a: 'b' }, absolute: false, fingerprint: true });
            }).to.throw();
            chai_1.expect(() => {
                urlFor('/static/test', { query: { a: 'b' }, absolute: true, fingerprint: true });
            }).to.throw();
        });
        it("should default fingerprint setting to (!!furl && !query)", () => {
            chai_1.expect(urlFor('/static/test', {}).includes('v=1')).to.be.true;
            chai_1.expect(urlFor('/static/test', { query: { a: 'b' } }).includes('v=1')).to.be.false;
            const urlForCantFingerprint = sut.makeUrlFor("ftp", "localhost");
            chai_1.expect(urlForCantFingerprint('/static/test', {}).includes('v=1')).to.be.false;
            chai_1.expect(urlForCantFingerprint('/static/test', { query: { a: 'b' } }).includes('v=1')).to.be.false;
        });
        it("should default absolute to false", () => {
            chai_1.expect(urlFor('/static/test', {}).startsWith('/static/test')).to.be.true;
            chai_1.expect(urlFor('/static/test', { query: { a: 'b' } }).startsWith('/static/test')).to.be.true;
            chai_1.expect(urlFor('/static/test', { fingerprint: true }).startsWith('/static/test')).to.be.true;
        });
        it("should handle all the valid permutations of the options", () => {
            chai_1.expect(urlFor('/static/test', { query: { a: 'b' }, absolute: true })).to.equal('ftp://localhost/static/test?a=b');
            chai_1.expect(urlFor('/static/test', { query: { a: 'b' }, absolute: false })).to.equal('/static/test?a=b');
            chai_1.expect(urlFor('/static/test', { absolute: true })).to.equal('ftp://localhost/static/test?v=1');
            chai_1.expect(urlFor('/static/test', { absolute: false })).to.equal('/static/test?v=1');
            chai_1.expect(urlFor('/static/test', { query: undefined, fingerprint: false, absolute: true })).to.equal('ftp://localhost/static/test');
            chai_1.expect(urlFor('/static/test', { query: undefined, fingerprint: false, absolute: false })).to.equal('/static/test');
        });
    });
});
