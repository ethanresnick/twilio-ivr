import * as chai from "chai";
import chaiAsPromised = require("chai-as-promised");
import { Map } from "immutable";
import * as td from "testdouble";
import { CallDataTwiml } from "twilio";
import "../../../lib/twilioAugments";
import { isImmutableEquals } from "../../utils";
import * as sut from "../../../lib/util/routeCreationHelpers";
import * as State from "../../../lib/state";
import * as states from "../../fixtures/states";

chai.use(chaiAsPromised);
const {expect} = chai;

describe("route creation utilities", () => {
  describe("resolveBranches", () => {
    const thrower = () => { throw new Error("unexpected.") };
    const emptySession = Map<string, any>();
    type SutReturn = Promise<[State.Session, State.RenderableState]>;

    describe("handling renderable input states", () => {
      it("should return a promise for the input state", () => {
        const results: any[] = states.renderableStates.map(state =>
          [state, emptySession, sut.resolveBranches(state, emptySession, <CallDataTwiml>{})]
        );

        const assertions = results.map(([state, session, resultPromise]) => {
          return (<SutReturn>resultPromise).then(([resolvedSession, resolvedState]) => {
            expect(state).to.equal(resolvedState);
            expect(session.equals(resolvedSession)).to.be.true;
          });
        });

        return Promise.all(assertions);
      });
    });

    describe("handling branching, non-renderable states", () => {
      let g: any, h: any, i: any, startSession: Map<string, any>,
        endSession: Map<string, any>, intermediateSession: Map<string, any>;

      beforeEach(function() {
        g = td.object(<State.NormalState>{
          name: "g",
          processTransitionUri: "/whatevs",
          twimlFor: () => undefined,
          transitionOut: (session, input) => Promise.resolve([session, this])
        });

        h = td.object(<State.BranchingState>{
          name: "h",
          transitionOut: (session, input) => Promise.resolve([session, this])
        });

        i = td.object(<State.BranchingState>{
          name: "i",
          transitionOut: (session, input) => Promise.resolve([session, this]),
        });

        startSession = Map<string, any>();
        intermediateSession = startSession.merge({i1: true, i2: true});
        endSession = Map<string, any>({i1: true, i2: false, h: true});

        td.when(i.transitionOut(isImmutableEquals(startSession)), {ignoreExtraArgs: true})
          .thenResolve([intermediateSession, h]);

        td.when(h.transitionOut(isImmutableEquals(intermediateSession)), {ignoreExtraArgs: true})
          .thenResolve([endSession, g]);
      });

      it("should update the session along the way", () => {
        return sut.resolveBranches(i, startSession, undefined).then(([session, state]) => {
          expect(session.equals(endSession)).to.be.true;
        });
      });

      it("should pass any input data to the first non-renderable state, but not subsequent ones", () => {
        return sut.resolveBranches(i, startSession, <CallDataTwiml>{}).then(([session, state]) => {
          td.verify(i.transitionOut(td.matchers.anything(), {}));
          td.verify(h.transitionOut(td.matchers.anything(), undefined));
        });
      });

      it("should not call transition out on the renderable state, once found", () => {
        return sut.resolveBranches(i, startSession, <CallDataTwiml>{}).then(([session, state]) => {
          td.verify(g.transitionOut(), {times: 0, ignoreExtraArgs: true});
        });
      });
    });
  });

  describe("urlFor", () => {
    const urlForBound = sut.urlFor("ftp", "localhost", (it) => it + '?v=1');

    it("should reject an attempt to fingerprint a uri with a query parameter", () => {
      expect(() => {
        urlForBound('/test', {query: {a: 'b'}, absolute: false, fingerprint: true})
      }).to.throw();
      expect(() => {
        urlForBound('/test', {query: {a: 'b'}, absolute: true, fingerprint: true})
      }).to.throw();
    });

    it("should default fingerprint to not query", () => {
      expect(urlForBound('/test', {}).includes('v=1')).to.be.true;
      expect(urlForBound('/test', {query: {a: 'b'}}).includes('v=1')).to.be.false;
    });

    it("should default absolute to false", () => {
      expect(urlForBound('/test', {}).startsWith('/test')).to.be.true;
      expect(urlForBound('/test', {query: {a: 'b'}}).startsWith('/test')).to.be.true;
      expect(urlForBound('/test', {fingerprint: true}).startsWith('/test')).to.be.true;
    });

    it("should handle all the valid permutations of the options", () => {
      // Query can be true (in which case fingerprint must be falsey), with absolute as true or false.
      expect(urlForBound('/test', {query: {a: 'b'}, absolute: true})).to.equal('ftp://localhost/test?a=b');
      expect(urlForBound('/test', {query: {a: 'b'}, absolute: false})).to.equal('/test?a=b');

      // Or query can be falsey, with fingerprint true, with absolute true or false.
      expect(urlForBound('/test', { absolute: true })).to.equal('ftp://localhost/test?v=1');
      expect(urlForBound('/test', { absolute: false })).to.equal('/test?v=1');

      // Or both query and fingerprint can be falsey, with absolute true or false.
      expect(urlForBound('/test', {query: undefined, fingerprint: false, absolute: true})).to.equal('ftp://localhost/test');
      expect(urlForBound('/test', {query: undefined, fingerprint: false, absolute: false})).to.equal('/test');
    });
  })
});
