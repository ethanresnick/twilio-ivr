import chai = require("chai");
import express = require("express");
import sut from "../../lib/index";
import * as states from "../fixtures/states";

const { expect } = chai;

describe("main express app creation function", () => {
  it("should return an express app", () => {
    let result = sut([], { twilio: {authToken: ""} });
    expect(isExpressApp(result)).to.be.true;
  });

  it("should apply the user's express config options to the app", () => {
    let dummyEtagFn = () => undefined;
    let app = sut([], {
      twilio: {authToken: ""},
      express: {"case sensitive routing": true, etag: dummyEtagFn}
    });

    expect(app.get('case sensitive routing')).to.be.true;
    expect(app.get('etag')).to.equal(dummyEtagFn);
  });

  it("should error at creation time when given a state with an invalid shape", () => {
    let statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
    let makeApp = () => {
      return sut(statesWithInvalidState, {twilio: {authToken: ""}});
    };

    expect(makeApp).to.throw(/Invalid state/);
  });
});

// A crude way to check if a value is an express app,
// since an elegant way doesn't seem to exist.
function isExpressApp(v: any) {
  let appProtoish = (<any>express).application;

  return v.set === (appProtoish && appProtoish.set);
}
