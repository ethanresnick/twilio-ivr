import twilio = require("twilio");
import request = require("supertest");
import lib from "../../lib/";
import { ValidState } from "../../lib/state";

const states: ValidState[] = [<ValidState>{
  uri: "/returns-twiml-response",
  name: "DUMMY",
  twimlFor() { return new twilio.TwimlResponse(); }
}, <ValidState>{
  uri: "/returns-twiml-string",
  name: "DUMMY",
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
