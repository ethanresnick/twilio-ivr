import fs = require("fs");
import path = require("path");
import request = require("supertest");
import streamEqual = require("stream-equal");
import twilio = require("twilio");
import lib from "../../lib/";
import { urlFor, EndState, RoutableState } from "../../lib/state";

const musicPath = path.join(__dirname, "../fixtures/music/");

describe("versioned static files", () => {
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
