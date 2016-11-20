import fs = require("fs");
import path = require("path");
import request = require("supertest");
import streamEqual = require("stream-equal");
import twilio = require("twilio");
import lib from "../../lib/";
import { urlFor, EndState, RoutableState } from "../../lib/state";

const musicPath = path.join(__dirname, "../fixtures/music/");

describe("versioned static files", () => {
  describe("receiving static files", () => {
    // We use this function to check if the res's contents are the same as
    // Tammy.mp3; if they are, we modify res.body to some known value, which
    // we can then assert on. Note: we have to compare the streams in parse(),
    // not end(), because superagent seems to do some weird buffering or
    // mutating on the response stream even if we say buffer(false). We also
    // have to set res.body to an object literal not a simple string; the latter
    // would be nicer, but, when we assert on the body's contents, supertest
    // will look in res.text (not res.body) if our assertion is a string.
    const parseMp3FileResponse = (res: any, cb: any) => {
      let musicStream = fs.createReadStream(path.join(musicPath, "Tammy.mp3"));
      streamEqual(res, musicStream, (err, streamsAreEqual) => {
        cb(err, streamsAreEqual ? {msg: "True"} : {msg: "Unequal Contents"});
      });
    };

    it("should work when there's no static files url prefix", () => {
      let app = lib([], filesConfig({ path: musicPath }));
      let agent = request.agent(app);

      return agent
        .get("/Tammy.mp3")
        .parse(parseMp3FileResponse)
        .expect({msg: "True"});
    });

    it("should work when there is a static files url prefix", () => {
      let app = lib([], filesConfig({ path: musicPath, mountPath: '/static' }));
      let agent = request.agent(app);

      return agent
        .get("/static/Tammy.mp3")
        .parse(parseMp3FileResponse)
        .buffer()
        .expect({msg: "True"});
    });

    it("should include a far future cache header with the files", () => {
      let app = lib([], filesConfig({ path: musicPath }));
      let agent = request.agent(app);

      return agent
        .get("/Tammy.mp3")
        .expect("Cache-Control", "public, max-age=31536000");
    });
  });

  describe("urlFor", () => {
    it("should account for the static files prefix, if any", () => {
      let state: EndState & RoutableState = {
        name: "ONLY_STATE",
        uri: "/only-state",
        isEndState: true,
        twimlFor(furl: urlFor, input?: any) {
          let resp = new twilio.TwimlResponse();
          resp.play(furl('/static/Tammy.mp3'));
          return resp;
        }
      };

      let app = lib([state], filesConfig({ path: musicPath, mountPath: '/static' }));

      return request(app)
        .post("/only-state")
        .expect(/\/static\/Tammy\.mp3\?v=/);
    });
  })
});

function filesConfig(obj: any) {
  return {
    twilio: { authToken: "", validate: false},
    staticFiles: obj
  };
}
