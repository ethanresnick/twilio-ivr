import { expect } from "chai";
import { makeUrlFor } from "../../lib/modules/urlFor";

describe("urlFor", () => {
  const urlFor = makeUrlFor("ftp", "localhost", (it) => it + '?v=1');

  it("should reject an attempt to fingerprint a uri with a query parameter", () => {
    expect(() => {
      urlFor('/static/test', {query: {a: 'b'}, absolute: false, fingerprint: true})
    }).to.throw();
    expect(() => {
      urlFor('/static/test', {query: {a: 'b'}, absolute: true, fingerprint: true})
    }).to.throw();
  });

  it("should default fingerprint setting to (!!furl && !query)", () => {
    expect(urlFor('/static/test', {}).includes('v=1')).to.equal(true);
    expect(urlFor('/static/test', {query: {a: 'b'}}).includes('v=1')).to.equal(false);

    const urlForCantFingerprint = makeUrlFor("ftp", "localhost");
    expect(urlForCantFingerprint('/static/test', {}).includes('v=1')).to.equal(false);
    expect(urlForCantFingerprint('/static/test', {query: {a: 'b'}}).includes('v=1')).to.equal(false);
  });

  it("should default absolute to false", () => {
    expect(urlFor('/static/test', {}).startsWith('/static/test')).to.equal(true);
    expect(urlFor('/static/test', {query: {a: 'b'}}).startsWith('/static/test')).to.equal(true);
    expect(urlFor('/static/test', {fingerprint: true}).startsWith('/static/test')).to.equal(true);
  });

  it("should handle all the valid permutations of the options", () => {
    // Query can be true (in which case fingerprint must be falsey), with absolute as true or false.
    expect(urlFor('/static/test', {query: {a: 'b'}, absolute: true})).to.equal('ftp://localhost/static/test?a=b');
    expect(urlFor('/static/test', {query: {a: 'b'}, absolute: false})).to.equal('/static/test?a=b');

    // Or query can be falsey, with fingerprint true, with absolute true or false.
    expect(urlFor('/static/test', { absolute: true })).to.equal('ftp://localhost/static/test?v=1');
    expect(urlFor('/static/test', { absolute: false })).to.equal('/static/test?v=1');

    // Or both query and fingerprint can be falsey, with absolute true or false.
    expect(urlFor('/static/test', {query: undefined, fingerprint: false, absolute: true})).to.equal('ftp://localhost/static/test');
    expect(urlFor('/static/test', {query: undefined, fingerprint: false, absolute: false})).to.equal('/static/test');
  });

  it("should allow overriding the scheme/host on each use (iff we're generating absolute urls)", () => {
    const opts = {query: {a: 'b'}, host: 'test.com'};
    expect(urlFor('/static/test', {...opts, absolute: true })).to.equal('ftp://test.com/static/test?a=b');
    expect(urlFor('/static/test', {...opts, absolute: false })).to.equal('/static/test?a=b');

    const opts2 = {scheme: 'https'};
    expect(urlFor('/static/test', { ...opts2, absolute: false })).to.equal('/static/test?v=1');
    expect(urlFor('/static/test', { ...opts2, absolute: true })).to.equal('https://localhost/static/test?v=1');

    const opts3 = {query: undefined, fingerprint: false, host: 'true.com', scheme: 'gopher'};
    expect(urlFor('/static/test', { ...opts3, absolute: false })).to.equal('/static/test');
    expect(urlFor('/static/test', { ...opts3, absolute: true })).to.equal('gopher://true.com/static/test');
  });
});

