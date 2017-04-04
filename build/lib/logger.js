"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require("debug");
const objectValuesEntries_1 = require("./util/objectValuesEntries");
const loggers = {
    info: debug("twilio-ivr:info"),
    warn: debug("twilio-ivr:warn"),
    error: debug("twilio-ivr:error")
};
objectValuesEntries_1.entries(loggers).forEach(([name, logger]) => {
    logger.log = console[name].bind(console);
});
exports.default = loggers;
