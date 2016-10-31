"use strict";
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const immutable_1 = require("immutable");
const td = require("testdouble");
require("../../../src/lib/twilioAugments");
const utils_1 = require("../../utils");
const sut = require("../../../src/util/routeCreationHelpers");
const states = require("../../fixtures/states");
chai.use(chaiAsPromised);
const { expect } = chai;
describe("route creation utilities", () => {
    describe("resolveBranches", () => {
        const thrower = () => { throw new Error("unexpected."); };
        const emptySession = immutable_1.Map();
        describe("handling renderable input states", () => {
            it("should return a promise for the input state", () => {
                const results = states.renderableStates.map(state => [state, emptySession, sut.resolveBranches(state, emptySession, {})]);
                const assertions = results.map(([state, session, resultPromise]) => {
                    return resultPromise.then(([resolvedSession, resolvedState]) => {
                        expect(state).to.equal(resolvedState);
                        expect(session.equals(resolvedSession)).to.be.true;
                    });
                });
                return Promise.all(assertions);
            });
        });
        describe("handling non-usable states as input", () => {
            it("should reject the state", () => {
                const results = states.nonUsableStates.map(state => [state, emptySession, sut.resolveBranches(state, emptySession, {})]);
                const assertions = results.map(([state, session, resultPromise]) => {
                    return resultPromise.then(() => { throw new Error("This promise should have thrown"); }, (e) => undefined);
                });
                return Promise.all(assertions);
            });
        });
        describe("handling branching, non-renderable states", () => {
            let g, h, i, startSession, endSession, intermediateSession;
            beforeEach(function () {
                g = td.object({
                    name: "g",
                    processTransitionUri: "/whatevs",
                    twimlFor: () => undefined,
                    transitionOut: (session, input) => Promise.resolve([session, this])
                });
                h = td.object({
                    name: "h",
                    transitionOut: (session, input) => Promise.resolve([session, this])
                });
                i = td.object({
                    name: "i",
                    transitionOut: (session, input) => Promise.resolve([session, this]),
                });
                startSession = immutable_1.Map();
                intermediateSession = startSession.merge({ i1: true, i2: true });
                endSession = immutable_1.Map({ i1: true, i2: false, h: true });
                td.when(i.transitionOut(utils_1.isImmutableEquals(startSession)), { ignoreExtraArgs: true })
                    .thenResolve([intermediateSession, h]);
                td.when(h.transitionOut(utils_1.isImmutableEquals(intermediateSession)), { ignoreExtraArgs: true })
                    .thenResolve([endSession, g]);
            });
            it("should update the session along the way", () => {
                return sut.resolveBranches(i, startSession, undefined).then(([session, state]) => {
                    expect(session.equals(endSession)).to.be.true;
                });
            });
            it("should pass any input data to the first non-renderable state, but not subsequent ones", () => {
                return sut.resolveBranches(i, startSession, {}).then(([session, state]) => {
                    td.verify(i.transitionOut(td.matchers.anything(), {}));
                    td.verify(h.transitionOut(td.matchers.anything(), undefined));
                });
            });
            it("should not call transition out on the renderable state, once found", () => {
                return sut.resolveBranches(i, startSession, {}).then(([session, state]) => {
                    td.verify(g.transitionOut(), { times: 0, ignoreExtraArgs: true });
                });
            });
        });
    });
    describe("urlFor", () => {
        const urlForBound = sut.urlFor("ftp", "localhost", (it) => it + '?v=1');
        it("should reject an attempt to fingerprint a uri with a query parameter", () => {
            expect(() => {
                urlForBound('/test', { query: { a: 'b' }, absolute: false, fingerprint: true });
            }).to.throw();
            expect(() => {
                urlForBound('/test', { query: { a: 'b' }, absolute: true, fingerprint: true });
            }).to.throw();
        });
        it("should default fingerprint to not query", () => {
            expect(urlForBound('/test', {}).includes('v=1')).to.be.true;
            expect(urlForBound('/test', { query: { a: 'b' } }).includes('v=1')).to.be.false;
        });
        it("should default absolute to false", () => {
            expect(urlForBound('/test', {}).startsWith('/test')).to.be.true;
            expect(urlForBound('/test', { query: { a: 'b' } }).startsWith('/test')).to.be.true;
            expect(urlForBound('/test', { fingerprint: true }).startsWith('/test')).to.be.true;
        });
        it("should handle all the valid permutations of the options", () => {
            expect(urlForBound('/test', { query: { a: 'b' }, absolute: true })).to.equal('ftp://localhost/test?a=b');
            expect(urlForBound('/test', { query: { a: 'b' }, absolute: false })).to.equal('/test?a=b');
            expect(urlForBound('/test', { absolute: true })).to.equal('ftp://localhost/test?v=1');
            expect(urlForBound('/test', { absolute: false })).to.equal('/test?v=1');
            expect(urlForBound('/test', { query: undefined, fingerprint: false, absolute: true })).to.equal('ftp://localhost/test');
            expect(urlForBound('/test', { query: undefined, fingerprint: false, absolute: false })).to.equal('/test');
        });
    });
});
