"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const express = require("express");
const index_1 = require("../../lib/index");
const states = require("../fixtures/states");
const index_2 = require("../util/index");
const { expect } = chai;
describe("main express app creation function", () => {
    it("should return an express app", () => {
        const result = index_1.default([], index_2.DEFAULT_CONFIG);
        expect(isExpressApp(result)).to.equal(true);
    });
    it("should error at creation time when given a state with an invalid shape", () => {
        const statesWithInvalidState = states.normalStates.concat(states.invalidStates[0]);
        const makeApp = () => {
            return index_1.default(statesWithInvalidState, index_2.DEFAULT_CONFIG);
        };
        expect(makeApp).to.throw(/Invalid state/);
    });
});
function isExpressApp(v) {
    const appProtoish = express.application;
    return v.set === (appProtoish && appProtoish.set);
}
