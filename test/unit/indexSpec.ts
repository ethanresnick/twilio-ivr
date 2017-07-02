import chai = require("chai");
import express = require("express");
import sut from "../../lib/index";
import * as states from "../fixtures/states";
import { DEFAULT_CONFIG } from "../util/index";

const { expect } = chai;

describe("main express app creation function", () => {
  it("should return an express app", () => {
    const result = sut([], DEFAULT_CONFIG);
    expect(isExpressApp(result)).to.equal(true);
  });

  it("should error at creation time when given a state with an invalid shape", () => {
    const statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
    const makeApp = () => {
      return sut(statesWithInvalidState, DEFAULT_CONFIG);
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
