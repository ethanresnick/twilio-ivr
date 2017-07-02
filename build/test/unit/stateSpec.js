"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const sut = require("../../lib/state");
const states = require("../fixtures/states");
const { expect } = chai;
describe("state types", () => {
    describe("isRoutableState", () => {
        it("should return true iff arg is a RoutableState", () => {
            states.routableStates.forEach(state => {
                expect(sut.isRoutableState(state)).to.equal(true);
            });
            const nonRoutableStates = states.allStates
                .filter(it => states.routableStates.indexOf(it) === -1);
            nonRoutableStates.forEach(state => {
                expect(sut.isRoutableState(state)).to.equal(false);
            });
        });
    });
    describe("isBranchingState", () => {
        it("should return true iff arg is a BranchingState", () => {
            states.branchingStates.forEach(state => {
                expect(sut.isBranchingState(state)).to.equal(true);
            });
            const nonBranchingStates = states.allStates
                .filter(it => states.branchingStates.indexOf(it) === -1);
            nonBranchingStates.forEach(state => {
                expect(sut.isBranchingState(state)).to.equal(false);
            });
        });
    });
    describe("isRenderableState", () => {
        it("should return true iff arg is a RenderableState", () => {
            states.renderableStates.forEach(state => {
                expect(sut.isRenderableState(state)).to.equal(true);
            });
            const nonRenderableStates = states.allStates
                .filter(it => states.renderableStates.indexOf(it) === -1);
            nonRenderableStates.forEach(state => {
                expect(sut.isRenderableState(state)).to.equal(false);
            });
        });
    });
    describe("isEndState", () => {
        it("should return true iff arg is an EndState", () => {
            states.endStates.forEach(state => {
                expect(sut.isEndState(state)).to.equal(true);
            });
            const nonEndStates = states.allStates
                .filter(it => states.endStates.indexOf(it) === -1);
            nonEndStates.forEach(state => {
                expect(sut.isEndState(state)).to.equal(false);
            });
        });
    });
    describe("isNormalState", () => {
        it("should return true iff arg is a NormalState", () => {
            states.normalStates.forEach(state => {
                expect(sut.isNormalState(state)).to.equal(true);
            });
            const nonNormalStates = states.allStates
                .filter(it => states.normalStates.indexOf(it) === -1);
            nonNormalStates.forEach(state => {
                expect(sut.isNormalState(state)).to.equal(false);
            });
        });
    });
    describe("isAsynchronousState", () => {
        it("should return true iff arg is a RenderableState", () => {
            states.asynchronousStates.forEach(state => {
                expect(sut.isAsynchronousState(state)).to.equal(true);
            });
            const nonAsyncStates = states.allStates
                .filter(it => states.asynchronousStates.indexOf(it) === -1);
            nonAsyncStates.forEach(state => {
                expect(sut.isAsynchronousState(state)).to.equal(false);
            });
        });
    });
    describe("isValidState", () => {
        it("should return true iff arg is a valid state", () => {
            states.invalidStates.forEach(state => {
                expect(sut.isValidState(state)).to.equal(false);
            });
            const validStates = states.allStates
                .filter(it => states.invalidStates.indexOf(it) === -1);
            validStates.forEach(state => {
                expect(sut.isValidState(state)).to.equal(true);
            });
        });
    });
});
