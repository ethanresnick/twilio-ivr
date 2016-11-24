"use strict";
const chai = require("chai");
const express = require("express");
const index_1 = require("../../lib/index");
const states = require("../fixtures/states");
const { expect } = chai;
describe("main express app creation function", () => {
    it("should return an express app", () => {
        let result = index_1.default([], { twilio: { authToken: "" } });
        expect(isExpressApp(result)).to.be.true;
    });
    it("should error at creation time when given a state with an invalid shape", () => {
        let statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
        let makeApp = () => {
            return index_1.default(statesWithInvalidState, { twilio: { authToken: "" } });
        };
        expect(makeApp).to.throw(/Invalid state/);
    });
});
function isExpressApp(v) {
    let appProtoish = express.application;
    return v.set === (appProtoish && appProtoish.set);
}
