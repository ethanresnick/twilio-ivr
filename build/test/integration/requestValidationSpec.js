"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const R = require("ramda");
const request = require("supertest");
const _1 = require("../../lib/");
const states = [{
        uri: "/",
        name: "DUMMY",
        isEndState: true,
        twimlFor() { return ""; }
    }];
describe("request signing", () => {
    const fakeToken = 'abcdefghijklmnopqrstuvwxyz1234567890';
    const fakeBody = { dummy: "val" };
    describe("default behavior", () => {
        const app = _1.default(states, { twilio: { authToken: fakeToken }, session: { secret: 'fuck' } });
        const agent = request.agent(app);
        it("should reject unsigned requests", () => {
            return agent
                .post("/")
                .expect(403);
        });
    });
    describe("validate: true", () => {
        const app = _1.default(states, { twilio: { authToken: fakeToken, validate: true }, session: { secret: 'fuck' } });
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
        const app = _1.default(states, { twilio: { authToken: fakeToken, validate: false }, session: { secret: 'fuck' } });
        const agent = request.agent(app);
        it("should allow all requests", () => {
            const test = agent.post("/");
            const testSig = makeSignature(fakeToken, test.url, fakeBody);
            const unsignedRequestAllowed = agent
                .post("/")
                .expect(200);
            const signedRequestAllowed = test
                .type('form')
                .send(fakeBody)
                .set('X-Twilio-Signature', testSig)
                .expect(200);
            return Promise.all([unsignedRequestAllowed, signedRequestAllowed]);
        });
    });
});
function makeSignature(authToken, url, body) {
    const finalUrl = Object.keys(body).sort().reduce((prev, key) => {
        return prev + key + body[key];
    }, url);
    return crypto.createHmac('sha1', authToken)
        .update(new Buffer(finalUrl, 'utf-8')).digest('base64');
}
const makeInvalidSignature = R.pipe(makeSignature, R.split(''), R.map((c) => String.fromCharCode(c.charCodeAt(0) + 1)), R.join(''));
