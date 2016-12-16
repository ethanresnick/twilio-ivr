"use strict";
const path = require("path");
const request = require("supertest");
const _1 = require("../../lib/");
const util_1 = require("../util");
const musicPath = path.join(__dirname, "../fixtures/music");
const hashOfHoldMusic = "a9f9bd368e461c339e9b79b9afadd97c";
describe("the hold music endpoint", () => {
    let baseStaticConfig = {
        holdMusic: { endpoint: "/hold-music", fileRelativeUri: "./theCalling.mp3" },
        path: musicPath
    };
    let mountedStaticConfig = Object.assign({}, baseStaticConfig, { mountPath: "/static/" });
    let holdMusicUrlStates = {
        normal: util_1.stateRenderingUrlFor("/hold-music", "/get-hold-music-endpoint"),
        mounted: util_1.stateRenderingUrlFor("/static/hold-music", "/get-hold-music-endpoint")
    };
    let agent = request(_1.default([holdMusicUrlStates.normal], util_1.filesConfig(baseStaticConfig)));
    let mountPathAgent = request(_1.default([holdMusicUrlStates.mounted], util_1.filesConfig(mountedStaticConfig)));
    describe("retrieval", () => {
        it("should respect static files mount path for purposes of its url", () => {
            return Promise.all([
                agent.get('/hold-music').expect(200),
                mountPathAgent.get('/static/hold-music').expect(200),
                agent.get('/static/hold-music').expect(404),
                mountPathAgent.get('/hold-music').expect(404),
            ]);
        });
    });
    describe("urlFor", () => {
        it("should include the static files mount path in generated url", () => {
            return mountPathAgent
                .post("/get-hold-music-endpoint")
                .expect("/static/hold-music?v=" + hashOfHoldMusic);
        });
        it("should use the version of the mp3 file to version the url", () => {
            return agent
                .post("/get-hold-music-endpoint")
                .expect("/hold-music?v=" + hashOfHoldMusic);
        });
        it("should still work if the holdMusicEndpoint starts with the same string as the static mount path", () => {
            let baseStaticConfig = {
                holdMusic: { endpoint: "/public-music", fileRelativeUri: "theCalling.mp3" },
                path: musicPath,
                mountPath: "/public"
            };
            let holdMusicUrlState = util_1.stateRenderingUrlFor("/public/public-music", "/get-hold-music-endpoint");
            let agent = request(_1.default([holdMusicUrlState], util_1.filesConfig(baseStaticConfig)));
            return agent
                .post("/get-hold-music-endpoint")
                .expect(`/public/public-music?v=${hashOfHoldMusic}`);
        });
    });
    describe("contents", () => {
        it("should use mount path, if any, and the mp3's fingerprint in its uri", () => {
            return Promise.all([
                agent
                    .get(`/hold-music?v=${hashOfHoldMusic}`)
                    .expect(new RegExp(`http\\://[\\d\\.\\:]+/theCalling\\.mp3\\?v=${hashOfHoldMusic}`)),
                mountPathAgent
                    .get(`/static/hold-music?v=${hashOfHoldMusic}`)
                    .expect(new RegExp(`http\\://[\\d\\.\\:]+/static/theCalling\\.mp3\\?v=${hashOfHoldMusic}`))
            ]);
        });
    });
});
