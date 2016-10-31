"use strict";
const chai = require("chai");
const td = require("testdouble");
const http = require("http");
const middleware_1 = require("../../../../src/lib/session/middleware");
const store_1 = require("../../../../src/lib/session/store");
const expect = chai.expect;
describe("the session middleware", () => {
    describe("the factory/wrapper function", () => {
        it("should require a store be provided", () => {
            expect(middleware_1.default).to.throw(/store/);
        });
        it("should return an express middleware", () => {
            const storeMock = td.object(store_1.default);
            expect(middleware_1.default({ store: storeMock })).to.be.a('function').with.length(3);
        });
    });
    describe(",", () => {
        it("should persist changes in joined user calls", () => {
            expect(true).to.be.false;
        });
    });
});
function createServer(opts, fn) {
    return http.createServer(createRequestListener(opts, fn));
}
function createRequestListener(opts, respond) {
    var _session = createSession(opts);
    return function onRequest(req, res) {
        var server = this;
        _session(req, res, function (err) {
            if (err && !res._header) {
                res.statusCode = err.status || 500;
                res.end(err.message);
                return;
            }
            if (err) {
                server.emit('error', err);
                return;
            }
            respond ? respond(req, res) : res.end();
        });
    };
}
function createSession(opts = {}) {
    return middleware_1.default(opts);
}
