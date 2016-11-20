import path = require("path");
import request = require("supertest");
import twilio = require("twilio");
import lib from "../../lib/";
import { urlFor, EndState, RoutableState } from "../../lib/state";
import { filesConfig } from "../util";

const musicPath = path.join(__dirname, "../fixtures/music/");
const hashOfHoldMusic = "23241bfb2abddb6f58a1e67e99565ec5";

describe("the hold music endpoint", () => {
  let baseStaticConfig = {
    holdMusic: { endpoint: "/hold-music", path: "theCalling.mp3" },
    path: musicPath
  };
  let mountedStaticConfig =
    Object.assign({}, baseStaticConfig, { mountPath: "/static" });

  let agent = request(lib([], filesConfig(baseStaticConfig)));
  let mountPathAgent = request(lib([], filesConfig(mountedStaticConfig)));

  describe("retrieval and contents", () => {
    it("should use mount path, if any, and version parameter in mp3's uri", () => {
      return Promise.all([
        agent.get("/hold-music?v=122").expect(/http\:\/\/[\d\.\:]+\/theCalling\.mp3\?v=122/),
        mountPathAgent.get("/hold-music?v=122").expect(/http\:\/\/[\d\.\:]+\/static\/theCalling\.mp3\?v=122/)
      ]);
    })
  });

  describe("urlFor", () => {
    it("should use the version of the mp3 file to version the url"/* ,(done) => {
      return agent.get("/theCalling.mp3").expect("it");
    }*/);
  });
})
