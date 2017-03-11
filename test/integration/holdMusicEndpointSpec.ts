import path = require("path");
import request = require("supertest");
import { Handler } from "express";
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

  describe("with custom fingerprintUrl and middleware", () => {
    const appConfig = filesConfig({
      fingerprintUrl: (path: string) => {
        const pathParts = path.split('.');
        if(pathParts.length > 1) {
          pathParts.splice(pathParts.length - 1, 0, 'abc');
          return pathParts.join('.');
        }
        else {
          return path + '--abc';
        }
      },
      mountPath: '/static',
      middleware: <Handler>((req, res, next) => {
        // If user provides their own middleware but wants to serve the hold
        // music with the built in middleware, they should remove the fingerprint
        // from the url and then just call next to get to the built-in one.
        if(req.url === '/hold-music--abc') {
          req.url = '/hold-music';
          next();
          return;
        }
        res.send("Hi from " + req.url);
      }),
      holdMusic: { endpoint: "/hold-music", fileRelativeUri: "./theCalling.mp3" }
    });

    const customFingerprintAgent = request(lib([holdMusicUrlStates.mounted], appConfig));

    // Fingerprint url may changet the url path, such that it doesn't match
    // the route registered for the for the hold music endpoint. We want to
    // test that the route is unfingerprinted first, so the built-in hold
    // music middleware still sees it.
    it("should work with path-changing fingerprint functions", () => {
      return customFingerprintAgent.get('/static/hold-music--abc')
        .expect(new RegExp(`http\\://[\\d\\.\\:]+/static/theCalling\\.abc.mp3`))
    });
  });
})
