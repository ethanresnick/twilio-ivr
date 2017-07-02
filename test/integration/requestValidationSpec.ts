import crypto = require("crypto");
import R = require("ramda");
import request = require("supertest");
import lib from "../../lib/";
import { UsableState } from "../../lib/state";

const states: UsableState[] = [<UsableState>{ //tslint:disable-line:no-object-literal-type-assertion
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
      const testSig = makeSignature(fakeToken, test.url, fakeBody);

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

    it('should reject requests with an invalid signature', () => {
      const test = agent.post("/");
      const invalidSig = makeInvalidSignature(fakeToken, test.url, fakeBody);

      return test
        .set('X-Twilio-Signature', invalidSig)
        .expect(403);
    });
  });

  describe("validate: false", () => {
    const app = lib(states, { twilio: { authToken: fakeToken, validate: false } });
    const agent = request.agent(app);

    it("should allow all requests", () => {
      const test = agent.post("/");
      const testSig = makeSignature(fakeToken, test.url, fakeBody);

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

/**
 * Makes a valid signature for the provided url/body pair, given a (dummy) auth token.
 * @param {string} authToken An auth token (not your real one!) used to sign the request.
 * @param {string} url The url for the request to sign
 * @param {object} body The request's body, as an object of string-valued params.
 */
function makeSignature(authToken: string, url: string, body: {[k: string]: string}) {
  const finalUrl = Object.keys(body).sort().reduce((prev, key) => {
    return prev + key + body[key];
  }, url);

  return crypto.createHmac('sha1', authToken)
    .update(new Buffer(finalUrl, 'utf-8')).digest('base64');
}

const makeInvalidSignature = R.pipe(
  makeSignature,
  R.split(''),
  R.map((c: string) => String.fromCharCode(c.charCodeAt(0) + 1)),
  R.join('')
);