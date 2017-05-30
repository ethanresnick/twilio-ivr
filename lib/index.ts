import * as State from "./state";
import { renderState } from "./util/routeCreationHelpers";
import { fingerprintUrl } from "./modules/urlFor";
import { default as makeMiddlewareAndFurl, StaticFilesConfig } from "./modules/staticFiles";

import { Express, Handler } from "express";
import express = require("express");
import bodyParser = require("body-parser");

import { webhook as twilioWebhook } from "twilio";
import "./twilioAugments";


export default function(states: State.ValidState[], config: config): Express {
  // Set up express
  const app = express();

  // Parse twilio POST payloads, which come as urlencoded strings...
  // TODO: handle pre-parsed bodies
  app.use(bodyParser.urlencoded({ extended: false }));

  // Verify that incoming requests are coming from twilio by default or if set.
  // Note: this requires the properties on express's req object to match the
  // properties of the request as twilio sent it (i.e., protocol, host, etc.
  // can't have been rewritten internally).
  const { validate = true } = config.twilio;
  app.use(twilioWebhook(config.twilio.authToken, { validate: validate }));

  // Set up our url fingerprinter. This will stay undefined if the user doesn't
  // opt in to any of our static file handling; if they do, we'll fill it with
  // the fingerprinting function returned by the static files module.
  let urlFingerprinter: fingerprintUrl | undefined;

  if (config.staticFiles) {
    // Create the middleware and url fingerprinter function that we're going
    // to use to serve static files. Save the calculated fingerprinting function.
    let serveStaticMiddlewares: Handler[];
    [serveStaticMiddlewares, urlFingerprinter] = makeMiddlewareAndFurl(config.staticFiles);

    // Register the middlewares to actually serve the static files/hold music.
    // Note: registering middlewares with an empty string mountPath is supported.
    // (see https://github.com/expressjs/express/blob/master/test/app.use.js#L515)
    app.use(config.staticFiles.mountPath || "", serveStaticMiddlewares);
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
        renderState(thisState, req, urlFingerprinter, req.body)
          .then(twiml => { res.send(twiml);  })
          .catch(next);
      });
    }

    if (State.isNormalState(thisState)) {
      app.post(thisState.processTransitionUri, function (req, res, next) {
        // Use the input to transition to the next state.
        const nextStatePromise = Promise.resolve(thisState.transitionOut(req.body));

        // Then, do what we do for renderable states, except don't pass
        // req.body anywhere, as we've already used that input to transition out.
        nextStatePromise
          .then(nextState => {
            return renderState(nextState, req, urlFingerprinter, undefined);
          })
          .then(twiml => { res.send(twiml); })
          .catch(next);
      });
    }
  });

  return app;
}

export type config = {
  readonly twilio: {
    readonly authToken: string;
    readonly validate?: boolean;
  };
  readonly staticFiles?: StaticFilesConfig;
}
