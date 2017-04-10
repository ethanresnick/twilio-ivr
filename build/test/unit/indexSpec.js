"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const express = require("express");
const index_1 = require("../../lib/index");
const states = require("../fixtures/states");
const { expect } = chai;
describe("main express app creation function", () => {
    it("should return an express app", () => {
        const result = index_1.default([], { twilio: { authToken: '' }, session: { secret: 'fuck' } });
        expect(isExpressApp(result)).to.be.true;
    });
    it("should error at creation time when given a state with an invalid shape", () => {
        const statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
        const makeApp = () => {
            return index_1.default(statesWithInvalidState, { twilio: { authToken: '' }, session: { secret: 'fuck' } });
        };
        expect(makeApp).to.throw(/Invalid state/);
    });
});
function isExpressApp(v) {
    const appProtoish = express.application;
    return v.set === (appProtoish && appProtoish.set);
}
