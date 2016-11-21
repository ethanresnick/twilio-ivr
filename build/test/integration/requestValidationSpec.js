"use strict";
const crypto = require("crypto");
const request = require("supertest");
const _1 = require("../../lib/");
let states = [{
        uri: "/",
        name: "DUMMY",
        isEndState: true,
        twimlFor() { return ""; }
    }];
describe("request signing", () => {
    let fakeToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
    let fakeBody = { dummy: "val" };
    describe("default behavior", () => {
        let app = _1.default(states, { twilio: { authToken: fakeToken } });
        let agent = request.agent(app);
        it("should reject unsigned requests", () => {
            return agent
                .post("/")
                .expect(403);
        });
    });
    describe("validate: true", () => {
        let app = _1.default(states, { twilio: { authToken: fakeToken, validate: true } });
        let agent = request.agent(app);
        it("should allow signed requests", () => {
            let test = agent.post("/");
            let testSig = makeDummySignature(fakeToken, test.url, fakeBody);
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
        let app = _1.default(states, { twilio: { authToken: fakeToken, validate: false } });
        let agent = request.agent(app);
        it("should allow all requests", () => {
            let test = agent.post("/");
            let testSig = makeDummySignature(fakeToken, test.url, fakeBody);
            let unsignedRequestAllowed = agent
                .post("/")
                .expect(200);
            let signedRequestAllowed = test
                .type('form')
                .send(fakeBody)
                .set('X-Twilio-Signature', testSig)
                .expect(200);
            return Promise.all([unsignedRequestAllowed, signedRequestAllowed]);
        });
    });
});
function makeDummySignature(authToken, url, body) {
    let finalUrl = Object.keys(body).sort().reduce((prev, key) => {
        return prev + key + body[key];
    }, url);
    return crypto.createHmac('sha1', authToken)
        .update(new Buffer(finalUrl, 'utf-8')).digest('Base64');
}
