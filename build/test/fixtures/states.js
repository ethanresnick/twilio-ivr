"use strict";
const twilio_1 = require("twilio");
const emptyTwimlFn = () => new twilio_1.TwimlResponse();
exports.d = {
    name: "d",
    staticTwimlFor: true
};
exports.e = {
    name: "e",
    uri: "/go"
};
exports.h = {
    name: "h",
    twimlFor: emptyTwimlFn,
    staticTwimlFor: true,
    backgroundTrigger: emptyTwimlFn
};
exports.routableStates = [exports.e];
exports.nonUsableStates = [exports.d, exports.e];
exports.f = {
    name: "f",
    transitionOut: (it) => Promise.resolve([it, exports.i])
};
exports.i = {
    name: "i",
    twimlFor: emptyTwimlFn,
    processTransitionUri: "/t",
    transitionOut: (it) => Promise.resolve([it, exports.h]),
};
exports.branchingStates = [exports.f, exports.i];
exports.g = {
    name: "g",
    isEndState: true,
    twimlFor: emptyTwimlFn
};
exports.endStates = [exports.g];
exports.normalStates = [exports.i];
exports.asynchronousStates = [exports.h];
exports.renderableStates = [exports.g, exports.i, exports.h];
exports.allStates = exports.nonUsableStates.concat(exports.branchingStates, exports.renderableStates);
