import path = require("path");
import request = require("supertest");
import twilio = require("twilio");
import lib from "../../lib/";
import { filesConfig, stateRenderingUrlFor } from "../util";

const musicPath = path.join(__dirname, "../fixtures/music");
const hashOfHoldMusic = "a9f9bd368e461c339e9b79b9afadd97c";

describe("the hold music endpoint", () => {
  let baseStaticConfig = {
    holdMusic: { endpoint: "/hold-music", path: "theCalling.mp3" },
    path: musicPath
  };
  let mountedStaticConfig =
    Object.assign({}, baseStaticConfig, { mountPath: "/static/" });

  let holdMusicUrlState =
    stateRenderingUrlFor("/hold-music", "/get-hold-music-endpoint");

  let agent = request(lib([holdMusicUrlState], filesConfig(baseStaticConfig)));
  let mountPathAgent = request(lib([holdMusicUrlState], filesConfig(mountedStaticConfig)));

  describe("retrieval", () => {
    it("should ignore static files mount path for purposes of its url", () => {
      return Promise.all([
        agent.get('/hold-music').expect(200),
        mountPathAgent.get('/hold-music').expect(200),
        agent.get('/static/hold-music').expect(404),
        mountPathAgent.get('/static/hold-music').expect(404),
      ]);
    });
  });

  describe("urlFor", () => {
    it("should not include the static files mount path in generated url", () => {
      return mountPathAgent
        .post("/get-hold-music-endpoint")
        .expect("/hold-music?v=" + hashOfHoldMusic);
    });

    it("should use the version of the mp3 file to version the url", () => {
      return agent
        .post("/get-hold-music-endpoint")
        .expect("/hold-music?v=" + hashOfHoldMusic);
    });

    it("should still work if the holdMusicEndpoint starts with the same string as the static mount path", () => {
      let baseStaticConfig = {
        holdMusic: { endpoint: "/public-music", path: "theCalling.mp3" },
        path: musicPath,
        mountPath: "/public"
      };

      let holdMusicUrlState =
        stateRenderingUrlFor("/public-music", "/get-hold-music-endpoint");

      let agent = request(lib([holdMusicUrlState], filesConfig(baseStaticConfig)));

      return agent
        .post("/get-hold-music-endpoint")
        .expect(`/public-music?v=${hashOfHoldMusic}`);
    });
  });

  describe("contents", () => {
    it("should use mount path, if any, and the mp3's fingerprint in its uri", () => {
      return Promise.all([
        agent
          .get(`/hold-music?v=${hashOfHoldMusic}`)
          .expect(new RegExp(`http\\://[\\d\\.\\:]+/theCalling\\.mp3\\?v=${hashOfHoldMusic}`)),

        mountPathAgent
          .get(`/hold-music?v=${hashOfHoldMusic}`)
          .expect(new RegExp(`http\\://[\\d\\.\\:]+/static/theCalling\\.mp3\\?v=${hashOfHoldMusic}`))
      ]);
    })
  });
})
