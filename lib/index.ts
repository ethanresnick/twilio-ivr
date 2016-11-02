import * as StateTypes from "./state";
import { getSessionData, renderState } from "./util/routeCreationHelpers";
import bodyParser = require("body-parser");
import expiry = require("static-expiry");
import { middleware as sessionMiddleware, Store as SessionStore } from "./session";
import * as express from "express";
import { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { webhook as twilioWebhook, TwimlResponse } from "twilio";
import "./lib/twilioAugments";
import "./lib/polyfillObjectValuesEntries";
import url = require("url");

// const sessionStorePromise = Promise.resolve().then((sequelize) => {
//     return new SessionStore();
//   }, (err) => {
//     throw err;
//   });

// TODO: document
export type config = {
  express: any;
  twilio: {
    authToken: string;
    validate: boolean
  };
  staticFiles: {
    path: string;
    mountPath?: string;
    holdMusic?: {
      path: string;
      loopCount: number;
      endpoint: string;
    }
  };
}

export default function(states: StateTypes.UsableState[], config: config): Express {
  // Set up express
  const app = express();
  Object.entries(config.express).forEach(([key, value]) => app.set(key, value));

  // Parse twilio POST payloads, which come as urlencoded strings...
  // TODO: handle pre-parsed bodies
  app.use(bodyParser.urlencoded({ extended: false }));

  // Verify that incoming requests are coming from twilio.
  // Note: this requires the properties on express's req object to match the
  // properties of the request as twilio sent it (i.e., protocol, host, etc.
  // can't have been rewritten internally).
  app.use(twilioWebhook(config.twilio.authToken, { validate: config.twilio.validate }));

  // Serve static recordings or twiml files from public, with an auto-invalidated far-future Expires.
  var staticHandlers = express();
  staticHandlers.use(expiry(app, {
    location: 'query',
    loadCache: 'startup',
    dir: config.staticFiles.path
  }));
  staticHandlers.use(express.static(config.staticFiles.path, { maxAge: '1y' }));

  // TODO: refactor maybe
  if (config.staticFiles.mountPath) {
    app.use(config.staticFiles.mountPath, staticHandlers);
  } else {
    app.use(staticHandlers);
  }

  if (config.staticFiles.holdMusic) {
    // TODO: assert that all these things exist / create default loopCount ???
    const { path, loopCount, endpoint } = config.staticFiles.holdMusic
    // Add the hold music route to the static-expiry fingerprint caches, since it
    // should have the same expiration properties as the mp3 file it links to.
    // (It's basically just a wrapper for that file.)
    // TODO: figure out why, or if, `path` below was prefixed with `/`
    const versionedHoldMp3Url = expiry.urlCache[path];
    const currMp3Version = url.parse(versionedHoldMp3Url, true).query.v;
    const versionedHoldMusicUrl = `${endpoint}?v=${currMp3Version}`

    expiry.urlCache[endpoint] = versionedHoldMusicUrl;
    expiry.assetCache[versionedHoldMusicUrl] =
    Object.assign({}, expiry.assetCache[versionedHoldMp3Url], {assetUrl: endpoint});

    // Add the route for our hold music, which isn't handled by the generic logic
    // below, because it's a bit of an exception: it's not a state (it doesn't
    // have any transition logic, as twilio stops playing it automatically when
    // another party connects to the call, so it can't be a normal state, but,
    // conceptually, it's not an end state either; and besides, it doesn't fit in
    // with the routing for states because we want twilio to make a cacheable, un-
    // parameterized GET request for it that doesn't involve loading the session),
    // but it's also not just a static file, because it needs to reflect the host
    // name differences of our dev/staging and production servers, because twilio
    // won't accept a relative URI...which is stupid.

    app.get(endpoint, (req, res, next) => {
      // holdUrl has to be an absolute URL
      const holdUrl = url.format({
        protocol: req.protocol,
        host: req.get('Host'),
        pathname: path,
        query: {v: req.query.v }
      });
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send((new TwimlResponse()).play({ loop: loopCount }, holdUrl));
    });
  }

  // Load information about the call in progress (if any) from the db.
  // The session will be saved in req.callSession.
  // app.use(sessionMiddleware({ store: callSessionStore }));

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
  //
  // Note: when ES6 modules become a thing, we'll need to iterate over the
  // exports differently.
  states.forEach(thisState => {
    if (!StateTypes.isValidState(thisState)) {
      const stateAsString = (thisState && thisState.name) || String(thisState);
      throw new Error("Invalid state provided: " + stateAsString);
    }

    if (StateTypes.isRoutableState(thisState)) {
      app.post(thisState.uri, function (req, res, next) {
        renderState(thisState, req, getSessionData(req), app.locals.furl, req.body).then(twiml => {
          res.send(twiml);
        }, next);
      });
    }

    if (StateTypes.isNormalState(thisState)) {
      app.post(thisState.processTransitionUri, function (req, res, next) {
        // Use the input to transition to the next state.
        const resultStateAndSessionPromise =
          thisState.transitionOut(getSessionData(req), req.body);

        // Then, do what we do for renderable states, except don't pass
        // req.body anywhere, as we've already used that input to transition out.
        resultStateAndSessionPromise.then(([updatedSession, resultState]) => {
          renderState(resultState, req, updatedSession, app.locals.furl, undefined).then(twiml => {
            res.send(twiml);
          }, next);
        });
      });
    }
  });

  return app;
}

// sessionStorePromise.then(callSessionStore => {});
