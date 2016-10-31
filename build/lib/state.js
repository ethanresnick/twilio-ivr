"use strict";
require("./twilioAugments");
const routeCreationHelpers_1 = require("../util/routeCreationHelpers");
exports.urlFor = routeCreationHelpers_1.urlFor;
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
    return it && it.backgroundTrigger !== undefined;
}
exports.isAsynchronousState = isAsynchronousState;
function isNormalState(it) {
    return it && it.processTransitionUri !== undefined;
}
exports.isNormalState = isNormalState;
function isUsableState(it) {
    return isBranchingState(it) || isEndState(it) || isNormalState(it) || isAsynchronousState(it);
}
exports.isUsableState = isUsableState;
