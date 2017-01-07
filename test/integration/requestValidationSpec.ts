import crypto = require("crypto");
import request = require("supertest");
import lib from "../../lib/";
import { UsableState } from "../../lib/state";

const states: UsableState[] = [<UsableState>{
  uri: "/",
  name: "DUMMY",
  isEndState: true,
  twimlFor() { return ""; }
}];

describe("request signing", () => {
  const fakeToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
  const fakeBody = { dummy: "val" };

  describe("default behavior", () => {
    const app = lib(states, { twilio: { authToken: fakeToken } });
    const agent = request.agent(app);

    it("should reject unsigned requests", () => {
      return agent
        .post("/")
        .expect(403);
    });
  });

  describe("validate: true", () => {
    const app = lib(states, { twilio: { authToken: fakeToken, validate: true } });
    const agent = request.agent(app);

    it("should allow signed requests", () => {
      const test = agent.post("/");
      const testSig = makeDummySignature(fakeToken, test.url, fakeBody);

      return test
        .type('form')
        .send(fakeBody)
        .set('X-Twilio-Signature', testSig)
        .expect(200);
    });

    it("should reject unsigned requests", () => {
      return agent
        .post("/")
        .expect(403);
    });
  });

  describe("validate: false", () => {
    const app = lib(states, { twilio: { authToken: fakeToken, validate: false } });
    const agent = request.agent(app);

    it("should allow all requests", () => {
      const test = agent.post("/");
      const testSig = makeDummySignature(fakeToken, test.url, fakeBody);

      const unsignedRequestAllowed =
        agent
          .post("/")
          .expect(200);

      const signedRequestAllowed =
        test
          .type('form')
          .send(fakeBody)
          .set('X-Twilio-Signature', testSig)
          .expect(200)

      return Promise.all([unsignedRequestAllowed, signedRequestAllowed]);
    });
  });
});

function makeDummySignature(authToken: string, url: string, body: any) {
  const finalUrl = Object.keys(body).sort().reduce((prev, key) => {
    return prev + key + body[key];
  }, url);

  return crypto.createHmac('sha1', authToken)
    .update(new Buffer(finalUrl, 'utf-8')).digest('base64');
}
