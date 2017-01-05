import * as State from "./state";
import { makeServingMiddlewareAndFurl, getFingerprintForFile } from "./util/staticExpiryHelpers";
import { renderState, makeUrlFor, fingerprintUrl } from "./util/routeCreationHelpers";

import { Express, Handler } from "express";
import express = require("express");
import bodyParser = require("body-parser");
import path = require("path");

import { webhook as twilioWebhook, TwimlResponse } from "twilio";
import "./twilioAugments";


export default function(states: State.UsableState[], config: config): Express {
  // Set up express
  const app = express();

  // Parse twilio POST payloads, which come as urlencoded strings...
  // TODO: handle pre-parsed bodies
  app.use(bodyParser.urlencoded({ extended: false }));

  // Verify that incoming requests are coming from twilio by default or if set.
  // Note: this requires the properties on express's req object to match the
  // properties of the request as twilio sent it (i.e., protocol, host, etc.
  // can't have been rewritten internally).
  let { validate = true } = config.twilio;
  app.use(twilioWebhook(config.twilio.authToken, { validate: validate }));

  // Declare our urlFingerprinter variable. Do so out here, because we pass it
  // to renderState even if static file handling is disabled, as its required to
  // create urlFor. Note: if the user doesn't provide any static files config,
  // this is intentionally left undefined.
  let urlFingerprinter: fingerprintUrl | undefined;

  // Serve static files (probably audio or twiml) with
  // auto-invalidated, far-future caching headers.
  if (config.staticFiles) {
    let staticFilesMountPath = config.staticFiles.mountPath || "";
    let serveStaticMiddleware: Handler[];

    [serveStaticMiddleware, urlFingerprinter] = ((staticFilesConf) => {
      type ReturnTuple = [Handler[], fingerprintUrl];

      if (staticFilesConf.fingerprintUrl && staticFilesConf.middleware) {
        return <ReturnTuple>[[staticFilesConf.middleware], staticFilesConf.fingerprintUrl];
      }

      else if(staticFilesConf.path) {
        let [middleware, furl] =
          makeServingMiddlewareAndFurl(app, staticFilesMountPath, staticFilesConf.path);

        // user's middleware always overrides, even if we're using built-in furl.
        middleware = staticFilesConf.middleware ? [staticFilesConf.middleware] : middleware;

        return <ReturnTuple>[middleware, furl];
      }

      else {
        throw new Error(
          "To use twilio-ivr's built-in static files handling, you must set " +
          "either the path option or the fingerprintUrl and middleware options."
        );
      }
    })(config.staticFiles);

    if (config.staticFiles.holdMusic) {
      const holdMusicFileUri = config.staticFiles.holdMusic.fileRelativeUri;
      const holdMusicEndpoint = config.staticFiles.holdMusic.endpoint || "/hold-music";
      const holdMusicEndpointMounted = path.normalize(staticFilesMountPath + '/' + holdMusicEndpoint);

      const holdMusicTwimlFor = config.staticFiles.holdMusic.twimlFor ||
        ((urlFor: State.urlFor) =>
          (new TwimlResponse()).play({ loop: 1000 }, urlFor(
            path.normalize(staticFilesMountPath + '/' + holdMusicFileUri), { absolute: true }
          )));

      if(!holdMusicFileUri) {
        throw new Error("You must provide a relative uri to your hold music file.");
      }

      // If the built-in furl is in use, make it fingerpint the hold music
      // endpoint with the current fingerprint of the file at holdMusicPath,
      // so both expire at the same time.
      if(!config.staticFiles.fingerprintUrl) {
        const origUrlFingerprinter = urlFingerprinter;
        const musicFileFingerprint = (() => {
          try {
            return getFingerprintForFile(holdMusicFileUri);
          }
          catch (e) {
            throw new Error("Your hold music file could not be found.");
          }
        })();

        urlFingerprinter = (path: string) => {
          return (path === holdMusicEndpointMounted) ?
            `${holdMusicEndpointMounted}?v=${musicFileFingerprint}` :
            origUrlFingerprinter(path);
        };
      }

      // Define the middleware for our hold music, which isn't handled as a state
      // because it's not a state conceptually (it doesn't have the transition
      // logic of a normal state, since twilio stops playing it automatically
      // when another party connects to the call, and it's not an end state
      // either) and -- more importantly -- it doesn't fit in with the routing
      // for states because we want twilio to make a cacheable, un-parameterized
      // GET request for it. But it's also not just a static file, because it
      // has dynamic content (i.e., the fingerprint of the hold music file and
      // the host name of the server, because twilio won't accept a relative URI).
      let holdMusicMiddleware = express().get(holdMusicEndpoint, (req, res, next) => {
        let urlFor = makeUrlFor(req.protocol, req.get('Host'), urlFingerprinter);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(holdMusicTwimlFor(urlFor));
      });

      // Then add the middleware either: at the beginning of the static serving
      // chain, if we're using the built-in static-expiry-derived middleware
      // (because we don't want to try to look up a static file for the hold
      // music endpoint); but at the end if the user has provided their own
      // static files middleware (because we want them to rewrite the
      // fingerprinted url as needed and then call next to get this middleware).
      serveStaticMiddleware[config.staticFiles.middleware ? "push" : "unshift"](holdMusicMiddleware);
    }

    // Register middleware for handling static files and hold music.
    // Note: even if staticFilesMountPath is an empty string, this still works
    // (see https://github.com/expressjs/express/blob/master/test/app.use.js#L515)
    app.use(staticFilesMountPath, serveStaticMiddleware);
  }

  // Below, we iterate over all the states and set up routes to handle them.
  // This route setup happens before our app starts, as sort of a "compile" phase.
  //
  // For states that are routable (i.e., have a `uri`) we set up a POST route
  // to go straight to that state.
  //
  // For states that aren't routable and that have a processTransitionURI,
  // we just need to set up the route that's called when that URI is hit.
  // And we always set that up as a POST for simplicity (the whole point of
  // these states, of course, is that the next transition is dynamic; using a
  // GET with query params could be hacked in, but it's too complicated).
  states.forEach(thisState => {
    if (!State.isValidState(thisState)) {
      const stateAsString = State.stateToString(thisState);
      throw new Error("Invalid state provided: " + stateAsString);
    }

    if (State.isRoutableState(thisState)) {
      app.post(thisState.uri, function (req, res, next) {
        renderState(thisState, req, urlFingerprinter, req.body).then(twiml => {
          res.send(twiml);
        }, next);
      });
    }

    if (State.isNormalState(thisState)) {
      app.post(thisState.processTransitionUri, function (req, res, next) {
        // Use the input to transition to the next state.
        const nextStatePromise = Promise.resolve(thisState.transitionOut(req.body));

        // Then, do what we do for renderable states, except don't pass
        // req.body anywhere, as we've already used that input to transition out.
        nextStatePromise.then(nextState => {
          renderState(nextState, req, urlFingerprinter, undefined).then(twiml => {
            res.send(twiml);
          }, next);
        });
      });
    }
  });

  return app;
}

// For the static files config, basically, the user either gives us a
// fingerprintUrl fn and a middleware for handling those urls, or gives us a
// path so we can fall back to using static-expiry + express-static for that.
type BuiltinStaticFilesHandlingConfig = {
  readonly path: string;
  readonly middleware?: Handler;
  readonly fingerprintUrl: undefined;
};

type CustomStaticFilesHandlingConfig = {
  readonly path: undefined;
  readonly middleware: Handler;
  readonly fingerprintUrl: fingerprintUrl;
}

type StaticFilesConfig =
  (BuiltinStaticFilesHandlingConfig | CustomStaticFilesHandlingConfig) & {
    readonly mountPath?: string;
    readonly holdMusic?: {
      readonly fileRelativeUri: string;
      readonly endpoint?: string;
      readonly twimlFor?: (urlFor: State.urlFor) => TwimlResponse | string;
    }
  };

export type config = {
  readonly twilio: {
    readonly authToken: string;
    readonly validate?: boolean;
  };
  readonly staticFiles?: StaticFilesConfig;
}
