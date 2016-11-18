import crypto = require("crypto");
import twilio = require("twilio");
import request = require("supertest");
import lib from "../../lib/";
import { UsableState } from "../../lib/state";

let states: UsableState[] = [<UsableState>{
  uri: "/",
  name: "DUMMY",
  isEndState: true,
  twimlFor() { return ""; }
}];

describe("request signing", () => {
  let fakeToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
  let fakeBody = { dummy: "val" };

  describe("default behavior", () => {
    let app = lib(states, { twilio: { authToken: fakeToken } });
    let agent = request.agent(app);

    it("should reject unsigned requests", (done) => {
      agent
        .post("/")
        .expect(403, done);
    });
  });

  describe("validate: true", () => {
    let app = lib(states, { twilio: { authToken: fakeToken, validate: true } });
    let agent = request.agent(app);

    it("should allow signed requests", (done) => {
      let test = agent.post("/");
      let testSig = makeDummySignature(fakeToken, test.url, fakeBody);

      test
        .type('form')
        .send(fakeBody)
        .set('X-Twilio-Signature', testSig)
        .expect(200, done);
    });

    it("should reject unsigned requests", (done) => {
      agent
        .post("/")
        .expect(403, done);
    });
  });

  describe("validate: false", () => {
    let app = lib(states, { twilio: { authToken: fakeToken, validate: false } });
    let agent = request.agent(app);

    it("should allow all requests", () => {
      let unsignedRequestAllowed = new Promise((resolve, reject) => {
        agent
        .post("/")
        .expect(200, (err: any) => {
          err ? reject(err) : resolve();
        });
      });

      let signedRequestAllowed = new Promise((resolve, reject) => {
        let test = agent.post("/");
        let testSig = makeDummySignature(fakeToken, test.url, fakeBody);

        test
          .type('form')
          .send(fakeBody)
          .set('X-Twilio-Signature', testSig)
          .expect(200, (err: any) => {
          err ? reject(err) : resolve();
        });
      });

      return Promise.all([unsignedRequestAllowed, signedRequestAllowed]);
    });
  });
});

function makeDummySignature(authToken: string, url: string, body: any) {
  let finalUrl = Object.keys(body).sort().reduce((prev, key) => {
    return prev + key + body[key];
  }, url);

  return crypto.createHmac('sha1', authToken)
    .update(new Buffer(finalUrl, 'utf-8')).digest('Base64');
}
