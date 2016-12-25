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
    describe("serving static files", () => {
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
                .get(`/Tammy.mp3?v=${hashOfTammyMp3}`)
                .expect("Cache-Control", "public, max-age=31536000")
                .expect((res) => {
                if (!res.header.expires)
                    throw new Error("expires header expected");
            });
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
    describe("urlFor/fingerprinting (built-in)", () => {
        it("should account for the static files prefix, if any", () => {
            const tammyMountedUrlState = util_1.stateRenderingUrlFor("/static/Tammy.mp3", "/only-state");
            const tammyUnmountedUrlState = util_1.stateRenderingUrlFor("/Tammy.mp3", "/only-state");
            const app = _1.default([tammyMountedUrlState], util_1.filesConfig({ path: musicPath, mountPath: '/static' }));
            const appNoMountPath = _1.default([tammyUnmountedUrlState], util_1.filesConfig({ path: musicPath }));
            const appSlashMountPath = _1.default([tammyUnmountedUrlState], util_1.filesConfig({ path: musicPath, mountPath: '/' }));
            return Promise.all([
                request(app)
                    .post("/only-state")
                    .expect("/static/Tammy.mp3?v=" + hashOfTammyMp3),
                request(appNoMountPath)
                    .post("/only-state")
                    .expect("/Tammy.mp3?v=" + hashOfTammyMp3),
                request(appSlashMountPath)
                    .post("/only-state")
                    .expect("/Tammy.mp3?v=" + hashOfTammyMp3)
            ]);
        });
    });
    describe("user-provided middleware and fingerprinting function", () => {
        const tammyUrlState = util_1.stateRenderingUrlFor("/static/Tammy.mp3", "/only-state");
        const conf = util_1.filesConfig({
            fingerprintUrl: (path) => {
                let pathParts = path.split('.');
                pathParts.splice(pathParts.length - 1, 0, 'abc');
                return pathParts.join('.');
            },
            mountPath: '/static',
            middleware: ((req, res, next) => {
                res.send("Hi from " + req.url);
            })
        });
        const app = _1.default([tammyUrlState], conf);
        it("should use the user-provided fingerprinting function in urlFor", () => {
            return request(app)
                .post("/only-state")
                .expect("/static/Tammy.abc.mp3");
        });
        it("should use user-provided middleware to serve static files", () => {
            return request(app)
                .get("/static/Tammy.abc.mp3")
                .expect("Hi from /Tammy.abc.mp3");
        });
    });
    describe("user-provided middleware with built-in fingerprinting", () => {
        const tammyUrlState = util_1.stateRenderingUrlFor("/static/Tammy.mp3", "/only-state");
        const app = _1.default([tammyUrlState], util_1.filesConfig({
            path: musicPath,
            mountPath: '/static',
            middleware: ((req, res, next) => {
                res.send("Hi from " + req.url);
            })
        }));
        it("should use the built-in fingerprinting function in urlFor", () => {
            return request(app)
                .post("/only-state")
                .expect("/static/Tammy.mp3?v=" + hashOfTammyMp3);
        });
        it('should use the provided middleware to serve the file', () => {
            return request(app)
                .get("/static/Tammy.mp3?v=" + hashOfTammyMp3)
                .expect("Hi from /Tammy.mp3?v=" + hashOfTammyMp3);
        });
    });
});
