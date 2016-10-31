"use strict";
const config_1 = require("./config");
const twilio = require("twilio");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Promise.resolve(new twilio.RestClient(config_1.default.get("twilio:accountId"), config_1.default.get("twilio:authToken")));
