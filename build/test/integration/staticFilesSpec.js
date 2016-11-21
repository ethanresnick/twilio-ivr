"use strict";
const express = require("express");
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const streamEqual = require("stream-equal");
const _1 = require("../../lib/");
const util_1 = require("../util");
const musicPath = path.join(__dirname, "../fixtures/music/");
const hashOfTammyMp3 = "23241bfb2abddb6f58a1e67e99565ec5";
describe("versioned static files", () => {
    describe("receiving static files", () => {
        const parseMp3FileResponse = (res, cb) => {
            let musicStream = fs.createReadStream(path.join(musicPath, "Tammy.mp3"));
            streamEqual(res, musicStream, (err, streamsAreEqual) => {
                cb(err, streamsAreEqual ? { msg: "True" } : { msg: "Unequal Contents" });
            });
        };
        it("should work when there's no static files url prefix (mount path)", () => {
            let app = _1.default([], util_1.filesConfig({ path: musicPath }));
            let agent = request.agent(app);
            return agent
                .get("/Tammy.mp3")
                .parse(parseMp3FileResponse)
                .expect({ msg: "True" });
        });
        it("should work when there is a static files url prefix (mount path)", () => {
            let app = _1.default([], util_1.filesConfig({ path: musicPath, mountPath: '/static' }));
            let agent = request.agent(app);
            return agent
                .get("/static/Tammy.mp3")
                .parse(parseMp3FileResponse)
                .buffer()
                .expect({ msg: "True" });
        });
        it("should include a far future cache header with the files", () => {
            let app = _1.default([], util_1.filesConfig({ path: musicPath }));
            let agent = request.agent(app);
            return agent
                .get("/Tammy.mp3")
                .expect("Cache-Control", "public, max-age=31536000");
        });
        it("should fall through when the file doesn't exist", () => {
            let outerApp = express();
            let app = _1.default([], util_1.filesConfig({ path: musicPath }));
            outerApp.use(app);
            outerApp.use((req, res, next) => {
                res.status(404).send("My Custom 404zzz.");
            });
            return request(outerApp)
                .get("/unknownfile.mp3")
                .expect(404, "My Custom 404zzz.");
        });
    });
    describe("urlFor", () => {
        it("should account for the static files prefix, if any", () => {
            let tammyUrlState = util_1.stateRenderingUrlFor("/static/Tammy.mp3", "/only-state");
            let app = _1.default([tammyUrlState], util_1.filesConfig({ path: musicPath, mountPath: '/static' }));
            return request(app)
                .post("/only-state")
                .expect(new RegExp("/static/Tammy\\.mp3\\?v=" + hashOfTammyMp3));
        });
    });
});
