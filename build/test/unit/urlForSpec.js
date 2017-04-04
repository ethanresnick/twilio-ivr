"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const urlFor_1 = require("../../lib/urlFor");
describe("urlFor", () => {
    const urlFor = urlFor_1.makeUrlFor("ftp", "localhost", (it) => it + '?v=1');
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
        const urlForCantFingerprint = urlFor_1.makeUrlFor("ftp", "localhost");
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
