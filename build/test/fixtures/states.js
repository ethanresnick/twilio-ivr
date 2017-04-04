"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twilio_1 = require("twilio");
const emptyTwimlFn = () => new twilio_1.TwimlResponse();
exports.d = {
    name: "d",
    twimlFor: emptyTwimlFn
};
exports.e = {
    name: "e",
    uri: "/go"
};
exports.j = {
    name: "f",
    twimlFor: emptyTwimlFn,
    transitionOut: (it) => Promise.resolve(exports.i)
};
exports.h = {
    name: "h",
    twimlFor: emptyTwimlFn,
    backgroundTrigger: emptyTwimlFn
};
exports.routableStates = [exports.e];
exports.invalidStates = [exports.d, exports.e, exports.j];
exports.f = {
    name: "f",
    transitionOut: (it) => Promise.resolve(exports.i)
};
exports.i = {
    name: "i",
    twimlFor: emptyTwimlFn,
    processTransitionUri: "/t",
    transitionOut: (it) => Promise.resolve(exports.h),
};
exports.branchingStates = [exports.f, exports.i, exports.j];
exports.g = {
    name: "g",
    isEndState: true,
    twimlFor: emptyTwimlFn
};
exports.endStates = [exports.g];
exports.normalStates = [exports.i];
exports.asynchronousStates = [exports.h];
exports.renderableStates = [exports.d, exports.g, exports.i, exports.h, exports.j];
exports.allStates = exports.invalidStates.concat(exports.branchingStates, exports.renderableStates);
