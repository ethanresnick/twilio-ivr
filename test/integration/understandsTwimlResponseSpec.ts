import request = require("supertest");
import twilio = require('twilio')
const VoiceResponse = twilio.twiml.VoiceResponse;
import lib from "../../lib/";
import { UsableState } from "../../lib/state";

const states: UsableState[] = [<UsableState>{
  uri: "/returns-twiml-response",
  name: "DUMMY",
  isEndState: true,
  twimlFor() { return (new VoiceResponse()).toString(); }
}, <UsableState>{
  uri: "/returns-twiml-string",
  name: "DUMMY",
  isEndState: true,
  twimlFor() { return 'Test'; }
}];

describe("rending Twiml", () => {
  const app = lib(states, { twilio: { authToken: "", validate: false } });

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
