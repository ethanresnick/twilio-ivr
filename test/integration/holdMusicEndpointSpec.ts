import path = require("path");
import request = require("supertest");
import lib from "../../lib/";
import { filesConfig, stateRenderingUrlFor } from "../util";

const musicPath = path.join(__dirname, "../fixtures/music");
const hashOfHoldMusic = "a9f9bd368e461c339e9b79b9afadd97c";

describe("the hold music endpoint", () => {
  const baseStaticConfig = {
    holdMusic: { endpoint: "/hold-music", fileRelativeUri: "./theCalling.mp3" },
    path: musicPath
  };
  const mountedStaticConfig =
    Object.assign({}, baseStaticConfig, { mountPath: "/static/" });

  const holdMusicUrlStates = {
    normal: stateRenderingUrlFor("/hold-music", "/get-hold-music-endpoint"),
    mounted: stateRenderingUrlFor("/static/hold-music", "/get-hold-music-endpoint")
  }

  const agent = request(lib([holdMusicUrlStates.normal], filesConfig(baseStaticConfig)));
  const mountPathAgent = request(lib([holdMusicUrlStates.mounted], filesConfig(mountedStaticConfig)));

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
      const staticConfig = {
        holdMusic: { endpoint: "/public-music", fileRelativeUri: "theCalling.mp3" },
        path: musicPath,
        mountPath: "/public"
      };

      const holdMusicUrlState =
        stateRenderingUrlFor("/public/public-music", "/get-hold-music-endpoint");

      const thisTestAgent = request(lib([holdMusicUrlState], filesConfig(staticConfig)));

      return thisTestAgent
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
    })
  });
})
