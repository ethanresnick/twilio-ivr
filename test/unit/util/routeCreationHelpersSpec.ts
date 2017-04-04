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
      const g = {
        name: "g",
        processTransitionUri: "/whatevs",
        twimlFor: () => "",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(undefined)))
      };

      const h = {
        name: "h",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(g)))
      };

      const i = {
        name: "i",
        transitionOut: (<sinon.SinonSpy>((input) => Promise.resolve(h))),
      };

      beforeEach(function() {
        [g, h, i].forEach(it => sinon.spy(it, "transitionOut"));
      });

      afterEach(() => {
        [g, h, i].forEach(it => { it.transitionOut.restore() });
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
  describe("renderState", () => { }); // tslint:disable-line
});
