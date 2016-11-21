"use strict";
const chai = require("chai");
const express = require("express");
const index_1 = require("../../lib/index");
const { expect } = chai;
describe("main express app creation function", () => {
    it("should return an express app", () => {
        let result = index_1.default([], { twilio: { authToken: "" } });
        expect(isExpressApp(result)).to.be.true;
    });
    it("should apply the user's express config options to the app", () => {
        let dummyEtagFn = () => undefined;
        let app = index_1.default([], {
            twilio: { authToken: "" },
            express: { "case sensitive routing": true, etag: dummyEtagFn }
        });
        expect(app.get('case sensitive routing')).to.be.true;
        expect(app.get('etag')).to.equal(dummyEtagFn);
    });
});
function isExpressApp(v) {
    let appProtoish = express.application;
    return v.set === (appProtoish && appProtoish.set);
}
