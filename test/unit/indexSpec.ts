import chai = require("chai");
import express = require("express");
import sut from "../../lib/index";
import * as states from "../fixtures/states";

const { expect } = chai;

describe("main express app creation function", () => {
  it("should return an express app", () => {
    const result = sut([], { twilio: {authToken: ""} });
    expect(isExpressApp(result)).to.be.true;
  });

  it("should error at creation time when given a state with an invalid shape", () => {
    const statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
    const makeApp = () => {
      return sut(statesWithInvalidState, {twilio: {authToken: ""}});
    };

    expect(makeApp).to.throw(/Invalid state/);
  });
});

/**
 * A crude way to check if a value is an express app,
 * since an elegant way doesn't seem to exist.
 *
 * @param {any} v
 * @return {boolean} Whether the argument is an express app.
 */
function isExpressApp(v: any) {
  const appProtoish = (<any>express).application;

  return v.set === (appProtoish && appProtoish.set);
}
