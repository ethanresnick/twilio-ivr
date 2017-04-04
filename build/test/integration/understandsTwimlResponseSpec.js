"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twilio = require("twilio");
const request = require("supertest");
const _1 = require("../../lib/");
const states = [{
        uri: "/returns-twiml-response",
        name: "DUMMY",
        isEndState: true,
        twimlFor() { return new twilio.TwimlResponse(); }
    }, {
        uri: "/returns-twiml-string",
        name: "DUMMY",
        isEndState: true,
        twimlFor() { return 'Test'; }
    }];
describe("rending Twiml", () => {
    const app = _1.default(states, { twilio: { authToken: "", validate: false } });
    it("should render TwimlResponse object", () => {
        return request(app)
            .post("/returns-twiml-response")
            .expect('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    });
    it("should still be able to render strings", () => {
        return request(app)
            .post("/returns-twiml-string")
            .expect('Test');
    });
});
