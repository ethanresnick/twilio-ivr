"use strict";
const chai_1 = require("chai");
const chaiAsPromised = require("chai-as-promised");
const td = require("testdouble");
require("../../../lib/twilioAugments");
const sut = require("../../../lib/util/routeCreationHelpers");
const states = require("../../fixtures/states");
chai_1.use(chaiAsPromised);
describe("route creation utilities", () => {
    describe("resolveBranches", () => {
        const thrower = () => { throw new Error("unexpected."); };
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
            let g, h, i;
            beforeEach(function () {
                g = td.object({
                    name: "g",
                    processTransitionUri: "/whatevs",
                    twimlFor: () => "",
                    transitionOut: (input) => Promise.resolve(this)
                });
                h = td.object({
                    name: "h",
                    transitionOut: (input) => Promise.resolve(this)
                });
                i = td.object({
                    name: "i",
                    transitionOut: (input) => Promise.resolve(this),
                });
                td.when(i.transitionOut(td.matchers.anything()))
                    .thenResolve(h);
                td.when(h.transitionOut(td.matchers.anything()))
                    .thenResolve(g);
            });
            it("should pass any input data to the first non-renderable state, but not subsequent ones", () => {
                return sut.resolveBranches(i, {}).then(state => {
                    td.verify(i.transitionOut({}));
                    td.verify(h.transitionOut(undefined));
                });
            });
            it("should not call transition out on the renderable state, once found", () => {
                return sut.resolveBranches(i, {}).then(state => {
                    td.verify(g.transitionOut(), { times: 0, ignoreExtraArgs: true });
                });
            });
        });
    });
    describe("urlFor", () => {
        const urlForBound = sut.urlFor("ftp", "localhost", (it) => it + '?v=1');
        it("should reject an attempt to fingerprint a uri with a query parameter", () => {
            chai_1.expect(() => {
                urlForBound('/test', { query: { a: 'b' }, absolute: false, fingerprint: true });
            }).to.throw();
            chai_1.expect(() => {
                urlForBound('/test', { query: { a: 'b' }, absolute: true, fingerprint: true });
            }).to.throw();
        });
        it("should default fingerprint to not query", () => {
            chai_1.expect(urlForBound('/test', {}).includes('v=1')).to.be.true;
            chai_1.expect(urlForBound('/test', { query: { a: 'b' } }).includes('v=1')).to.be.false;
        });
        it("should default absolute to false", () => {
            chai_1.expect(urlForBound('/test', {}).startsWith('/test')).to.be.true;
            chai_1.expect(urlForBound('/test', { query: { a: 'b' } }).startsWith('/test')).to.be.true;
            chai_1.expect(urlForBound('/test', { fingerprint: true }).startsWith('/test')).to.be.true;
        });
        it("should handle all the valid permutations of the options", () => {
            chai_1.expect(urlForBound('/test', { query: { a: 'b' }, absolute: true })).to.equal('ftp://localhost/test?a=b');
            chai_1.expect(urlForBound('/test', { query: { a: 'b' }, absolute: false })).to.equal('/test?a=b');
            chai_1.expect(urlForBound('/test', { absolute: true })).to.equal('ftp://localhost/test?v=1');
            chai_1.expect(urlForBound('/test', { absolute: false })).to.equal('/test?v=1');
            chai_1.expect(urlForBound('/test', { query: undefined, fingerprint: false, absolute: true })).to.equal('ftp://localhost/test');
            chai_1.expect(urlForBound('/test', { query: undefined, fingerprint: false, absolute: false })).to.equal('/test');
        });
    });
});
