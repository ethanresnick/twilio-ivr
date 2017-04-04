"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twilio = require("twilio");
twilio.isCallDataTwiml = function (it) {
    return it && it.CallSid !== undefined;
};
