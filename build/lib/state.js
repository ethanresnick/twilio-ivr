"use strict";
require("./twilioAugments");
function isRoutableState(it) {
    return it && it.uri !== undefined;
}
exports.isRoutableState = isRoutableState;
function isBranchingState(it) {
    return it && it.transitionOut !== undefined;
}
exports.isBranchingState = isBranchingState;
function isRenderableState(it) {
    return it && it.twimlFor !== undefined;
}
exports.isRenderableState = isRenderableState;
function isEndState(it) {
    return it && it.isEndState === true;
}
exports.isEndState = isEndState;
function isAsynchronousState(it) {
    const state = it;
    return state && state.twimlFor !== undefined && state.backgroundTrigger !== undefined;
}
exports.isAsynchronousState = isAsynchronousState;
function isNormalState(it) {
    return it && it.processTransitionUri !== undefined;
}
exports.isNormalState = isNormalState;
function isValidState(it) {
    return isNormalState(it) || isAsynchronousState(it) || isEndState(it)
        || (isBranchingState(it) && !isRenderableState(it));
}
exports.isValidState = isValidState;
