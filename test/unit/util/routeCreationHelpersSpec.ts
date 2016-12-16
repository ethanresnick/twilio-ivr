import sinon = require("sinon");
import sinonChai = require("sinon-chai");
import { expect, use as chaiUse } from "chai";
import { CallDataTwiml } from "twilio";
import "../../../lib/twilioAugments";
import * as sut from "../../../lib/util/routeCreationHelpers";
import * as State from "../../../lib/state";
import * as states from "../../fixtures/states";

chaiUse(sinonChai);

describe("route creation utilities", () => {
  describe("resolveBranches", () => {
    const thrower = () => { throw new Error("unexpected.") };
    type SutReturn = Promise<State.RenderableState>;

    describe("handling renderable input states", () => {
      it("should return a promise for the input state", () => {
        const results: any[] = states.renderableStates.map(state =>
          [state, sut.resolveBranches(state, <CallDataTwiml>{})]
        );

        const assertions = results.map(([state, resultPromise]) => {
          return (<SutReturn>resultPromise).then((resolvedState) => {
            expect(state).to.equal(resolvedState);
          });
        });

        return Promise.all(assertions);
      });
    });

    describe("handling branching, non-renderable states", () => {
      let g = {
        name: "g",
        processTransitionUri: "/whatevs",
        twimlFor: () => "",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(this)))
      };

      let h = {
        name: "h",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(g)))
      };

      let i = {
        name: "i",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(h))),
      };

      beforeEach(function() {
        [g, h, i].forEach(it => sinon.spy(it, "transitionOut"));
      });

      afterEach(() => {
        [g, h, i].forEach(it => it.transitionOut.restore());
      })

      it("should pass any input data to the first non-renderable state, but not subsequent ones", () => {
        return sut.resolveBranches(i, <CallDataTwiml>{}).then(state => {
          expect(i.transitionOut).calledWithExactly({});
          expect(h.transitionOut).calledWithExactly(undefined);
        });
      });

      it("should finally return a promise for the first renderable state", () => {
        return sut.resolveBranches(i, <CallDataTwiml>{}).then(state => {
          expect(state.name).to.equal("g");
        });
      });

      it("should not call transition out on the renderable state, once found", () => {
        return sut.resolveBranches(i, <CallDataTwiml>{}).then(state => {
          expect(g.transitionOut).to.not.have.been.called;
        });
      });
    });
  });

  // The renderState function really just factors out duplicate code that's
  // used to render both routable states, and to render the next state after a
  // transitionOut. It doesn't do something super coherent on it's own, though,
  // (i.e., without the server code calling it properly), and how it integrates
  // with that code is subject to change. So, rather than unit testing it,
  // probably makes more sense just to do end to end tests on the server
  // responses, maybe using mock states to check that the right args were provided.
  describe("renderState", () => { });

  describe("urlFor", () => {
    const urlFor = sut.makeUrlFor("ftp", "localhost", (it) => it + '?v=1');

    it("should reject an attempt to fingerprint a uri with a query parameter", () => {
      expect(() => {
        urlFor('/static/test', {query: {a: 'b'}, absolute: false, fingerprint: true})
      }).to.throw();
      expect(() => {
        urlFor('/static/test', {query: {a: 'b'}, absolute: true, fingerprint: true})
      }).to.throw();
    });

    it("should default fingerprint setting to !query", () => {
      expect(urlFor('/static/test', {}).includes('v=1')).to.be.true;
      expect(urlFor('/static/test', {query: {a: 'b'}}).includes('v=1')).to.be.false;
    });

    it("should default absolute to false", () => {
      expect(urlFor('/static/test', {}).startsWith('/static/test')).to.be.true;
      expect(urlFor('/static/test', {query: {a: 'b'}}).startsWith('/static/test')).to.be.true;
      expect(urlFor('/static/test', {fingerprint: true}).startsWith('/static/test')).to.be.true;
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
  })
});
