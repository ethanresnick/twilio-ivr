import logger from "../logger";
import { crc32 } from "crc";
import * as express from "express";
import * as Immutable from "immutable";
import { SessionStore } from "./store";
import { CallSession, CallSid } from "./index";
import { isCallDataTwiml } from "twilio";
import "./lib/twilioAugments";

declare module "express" {
  interface Request {
    callSession?: reqCallSession<CallSession>
  }
}

export type reqCallSession<T extends CallSession> = {
  data: T,
  save: (id: CallSid, val: T) => Promise<T>,
  destroy: (id: CallSid) => Promise<boolean>
};

export interface SessionMiddlewareOpts<T extends CallSession> {
  /**
   * The store that the session middleware should use to find sessions.
   * @type {SessionStore<T>}
   */
  store: SessionStore<T>;

  /**
   * A function to call when the store is down. This function can call next
   * to continue handling the request without a session, or can end the request
   * with an error, or whatever.
   */
  storeDown?(req: express.Request, next: express.NextFunction): void;

  /**
   * The session middleware will check if an existing session exists with the
   * request's session id, and create a new one if not. If you know, for
   * certain requests, that there won't be an existing session, you can return
   * true from this function for those requests, and the middleware will
   * skip the neeedless query to check if a session already exists.
   */
  isKnownNewSession?(req: express.Request): boolean;

  /**
   * Whether to perist new sessions to the store when no data has been added to them.
   */
  saveUnitialized: boolean;
};

/**
 * Returns a middleware function that will extract a session id from the request,
 * query the database, and return a session object for each request. If this is
 * the first time we're seein a given session id, it returns a new CallSession
 * with just the sid. I.e., you should always get an object back.
 */
export default function<T extends CallSession>(opts: SessionMiddlewareOpts<T>) {
  const {
    store,
    storeDown = (req: express.Request, next: express.NextFunction) => { next() },
    isKnownNewSession = (req: express.Request) => false,
    saveUnitialized = true
  } = opts;

  if(!store) {
    throw new Error("A store is required.");
  }

  // register event listeners for the store to track readiness
  let storeReady = true
  store.on('disconnect', () => storeReady = false);
  store.on('connect', () => storeReady = true);

  return function(req: express.Request, res: express.Response, next: express.NextFunction) {
    // Helper stuff.
    const logIfErrorThenNext = (eOrValue: any) => {
      if(eOrValue instanceof Error) {
        logger.error(eOrValue.message);
      }
      next();
    };

    // skip if this middleware's already been invoked
    if (req.callSession) {
      return next();
    }

    // do what the user asks us to if the store is down.
    if(!storeReady) {
      return storeDown(req, next);
    }

    if(!req.body || !req.body.CallSid) {
      return next(`A session id could not be found. Make sure you've set up the
        body parsing middleware before the session middleware, as the session id
        is looked up in req.body.CallSid.`);
    }

    const sessionId = req.body.CallSid;

    // A hash of the session value found by the store at the start of the
    // request, or undefined if the session was new. This is used to decide if
    // we need to re-save the session in the store when a save is requested.
    let sessionAsSavedHash: string | undefined;

    function setupSession(session: T, isNew: boolean) {
      const result: [reqCallSession<T>, typeof sessionAsSavedHash] = [
        { data: session, save: saveSession, destroy: store.destroy.bind(store) },
        isNew ? undefined : session
      ];

      return result;
    }

    function saveSession(id: CallSid, sessionData: T) {
      const isUnitializedSession = !sessionAsSavedHash && ;
      const shouldSave = (isNewSession && saveUnitialized) ||

      if(!sessionAsSavedHash || !sessionAsSaved.equals(sessionData)) {
        return store.set(id, sessionData)
          .then(it => {
            req.callSession.data = sessionData;
            sessionAsSaved = sessionData;

            return req.callSession.data;
          })
          .catch(e => {
            logger.error(`Could not save new call state!`, e);
            throw e;
          });
      }

      return Promise.resolve(sessionData);
    }

    // Look up the session, unless we know it's new, and add the session
    // we find or a newly generater one to the request object. Also, store
    // a hash of the session we found, so we know whether to resave it when
    // save is called.
    if(isKnownNewSession(req)) {
      [req.callSession, sessionAsSavedHash] = setupSession(session, !callSession);
    }
    store.get(sessionId).then((callSession) => {
      const session = callSession || generate(sessionId);
      [req.callSession, sessionAsSaved] = setupSession(session, !callSession);
    }).then(logIfErrorThenNext, logIfErrorThenNext);

    /*
    var touched = false
  */
  }
}

function generate(sid: string): CallSession {
  return { callSid: sid };
}

function hash(session: any): string {
  return crc32(JSON.stringify(session));
}
