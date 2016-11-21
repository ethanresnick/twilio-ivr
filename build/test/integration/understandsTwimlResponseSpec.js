"use strict";
const twilio = require("twilio");
const request = require("supertest");
const _1 = require("../../lib/");
let states = [{
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
    let app = _1.default(states, { twilio: { authToken: "", validate: false } });
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
