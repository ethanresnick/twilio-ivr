"use strict";
const twilio = require("twilio");
twilio.isCallDataTwiml = function (it) {
    return it && it.CallSid !== undefined;
};
