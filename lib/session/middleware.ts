import logger from "../logger";
import * as express from "express";
import * as Immutable from "immutable";
import { CallSid } from "../../models/call";
import { SessionStore } from "./store";
import { CallSession, CallSessionImmutable } from "./index";
import { isCallDataTwiml } from "twilio";
import "./lib/twilioAugments";

declare module "express" {
  interface Request {
    callSession?: reqCallSession
  }
}

type reqCallSession = {
  data: CallSessionImmutable,
  save: (id: CallSid, val: CallSessionImmutable) => Promise<CallSessionImmutable>,
  destroy: (id: CallSid) => Promise<boolean>
};

type SessionMiddlewareOpts = { store: SessionStore };

/**
 * Returns a middleware function that will read req.body.CallSid and
 * req.query.userCallSid, query the database, and return an immutable
 * CallSession object for each request. If this is the first time we're
 * seein a given CallSid, it returns a CallSession with just the sid. I.e.,
 * you should always get an object back.
 *
 * @param {SessionStore} sessionStore An object with that this function will
 *     load to use the data (it probably has a db connection).
 */
export default function({ store }: SessionMiddlewareOpts) {
  if(!store) {
    throw new Error("A store is required.");
  }

  return function(req: express.Request, res: express.Response, next: express.NextFunction) {
    // skip if this middleware's already been invoked
    if (req.callSession) {
      return next();
    }

    const reqBody = req.body;
    const logIfErrorThenNext = (eOrValue: any) => {
      if(eOrValue instanceof Error) {
        logger.error(eOrValue.message);
      }
      next();
    };

    if(!req.body) {
      throw new Error("Load session middleware after body-parsing middleware.");
    }

    if(!isCallDataTwiml(reqBody)) {
      return next();
    }

    // Keep track of whether the session was found by the store at the start
    // of the request and, if so, what value was found. This is used to decide
    // if we need to (re)save the session in the store when a save is requested.
    let sessionAsSaved: CallSessionImmutable | undefined;

    function setupSession(session: CallSessionImmutable, isNew: boolean) {
      const result: [reqCallSession, CallSessionImmutable] = [
        { data: session, save: saveSession, destroy: store.destroy.bind(store) },
        isNew ? undefined : session
      ];

      return result;
    }

    function saveSession(id: CallSid, sessionData: CallSessionImmutable) {
      if(!sessionAsSaved || !sessionAsSaved.equals(sessionData)) {
        return store.set(id, immutableToCallSession(sessionData))
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

    // If we have a userCallSid parameter, assume we’re dealing with a
    // newly created operator request, so, create a new state for this call.
    // See the documentation for why this has to be a query parameter.
    if(req.query.userCallSid) {
      store.get(req.query.userCallSid).then(userCallSession => {
        const session = callSessionToImmutable({
          callSid: reqBody.CallSid,
          operatorId: req.query.operatorId || null,
          userCallSid: req.query.userCallSid,
          userCall: userCallSession || generate(req.query.userCallSid)
        });
        [req.callSession, sessionAsSaved] = setupSession(session, true);
      }).then(logIfErrorThenNext, logIfErrorThenNext);
    }

    // Otherwise, load the session from reqBody.CallSid
    else {
      store.get(reqBody.CallSid).then((callSession) => {
        const session = callSessionToImmutable(
          callSession || generate(reqBody.CallSid)
        );
        [req.callSession, sessionAsSaved] = setupSession(session, !callSession);
      }).then(logIfErrorThenNext, logIfErrorThenNext);
    }
  }
}

function generate(sid: string): CallSession {
  return { callSid: sid };
}

function callSessionToImmutable(session: CallSession): CallSessionImmutable {
  return Immutable.Map<string, any>(session);
}

function immutableToCallSession(immutable: CallSessionImmutable): CallSession {
  return immutable.toJS();
}
