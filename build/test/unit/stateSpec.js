"use strict";
const chai = require("chai");
const sut = require("../../lib/state");
const states = require("../fixtures/states");
const { expect } = chai;
describe("state types", () => {
    describe("isRoutableState", () => {
        it("should return true iff arg is a RoutableState", () => {
            states.routableStates.forEach(state => {
                expect(sut.isRoutableState(state)).to.be.true;
            });
            const nonRoutableStates = states.allStates
                .filter(it => states.routableStates.indexOf(it) === -1);
            nonRoutableStates.forEach(state => {
                expect(sut.isRoutableState(state)).to.be.false;
            });
        });
    });
    describe("isBranchingState", () => {
        it("should return true iff arg is a BranchingState", () => {
            states.branchingStates.forEach(state => {
                expect(sut.isBranchingState(state)).to.be.true;
            });
            const nonBranchingStates = states.allStates
                .filter(it => states.branchingStates.indexOf(it) === -1);
            nonBranchingStates.forEach(state => {
                expect(sut.isBranchingState(state)).to.be.false;
            });
        });
    });
    describe("isRenderableState", () => {
        it("should return true iff arg is a RenderableState", () => {
            states.renderableStates.forEach(state => {
                expect(sut.isRenderableState(state)).to.be.true;
            });
            const nonRenderableStates = states.allStates
                .filter(it => states.renderableStates.indexOf(it) === -1);
            nonRenderableStates.forEach(state => {
                expect(sut.isRenderableState(state)).to.be.false;
            });
        });
    });
    describe("isEndState", () => {
        it("should return true iff arg is an EndState", () => {
            states.endStates.forEach(state => {
                expect(sut.isEndState(state)).to.be.true;
            });
            const nonEndStates = states.allStates
                .filter(it => states.endStates.indexOf(it) === -1);
            nonEndStates.forEach(state => {
                expect(sut.isEndState(state)).to.be.false;
            });
        });
    });
    describe("isNormalState", () => {
        it("should return true iff arg is a NormalState", () => {
            states.normalStates.forEach(state => {
                expect(sut.isNormalState(state)).to.be.true;
            });
            const nonNormalStates = states.allStates
                .filter(it => states.normalStates.indexOf(it) === -1);
            nonNormalStates.forEach(state => {
                expect(sut.isNormalState(state)).to.be.false;
            });
        });
    });
    describe("isAsynchronousState", () => {
        it("should return true iff arg is a RenderableState", () => {
            states.asynchronousStates.forEach(state => {
                expect(sut.isAsynchronousState(state)).to.be.true;
            });
            const nonAsyncStates = states.allStates
                .filter(it => states.asynchronousStates.indexOf(it) === -1);
            nonAsyncStates.forEach(state => {
                expect(sut.isAsynchronousState(state)).to.be.false;
            });
        });
    });
    describe("isValidState", () => {
        it("should return true iff arg is a valid state", () => {
            states.invalidStates.forEach(state => {
                expect(sut.isValidState(state)).to.be.false;
            });
            const validStates = states.allStates
                .filter(it => states.invalidStates.indexOf(it) === -1);
            validStates.forEach(state => {
                expect(sut.isValidState(state)).to.be.true;
            });
        });
    });
});
