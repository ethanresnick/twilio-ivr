import * as StateTypes from "../state";
import logger from "../logger";
import * as express from "express";
import * as Immutable from "immutable";
import { CallDataTwiml, TwimlResponse } from "twilio";
import "../twilioAugments";
import url = require("url");

/**
 * This function takes a state and, while it's branching but not renderable,
 * calls transitionOut repeatedly to get us to the final state that we should
 * render. When it calls transitionOut, it passes input data (if any) the first
 * time, but not on subsequent calls, as subsequent states shouldn't know about
 * any input the user may have passed into the original branching state.
 *
 * With each transitionOut call, it keeps track of the new session and state,
 * and ultimately returns a promise for those. Note that the session changes
 * aren't persisted between transitionOut() calls, so a branching state shouldn't
 * trigger a request back to this service (probably not under any cases -- but
 * certainly not when processing that request requires the latest session data.)
 *
 * @param  {StateTypes.UsableState} state The initial state, which may or may
 *   not be renderable.
 * @param  {StateTypes.Session} callSession The call session.
 * @param  {CallDataTwiml} inputData Any user input taht should be passed to
 *   the initial state, and the initial state only, if it's not renderable.
 * @return {Promise<[StateTypes.Session, StateTypes.RenderableState]>}
 *   The final renderable state and the session for it.
 */
export function resolveBranches(state: StateTypes.UsableState, callSession: StateTypes.Session,
  inputData?: CallDataTwiml): Promise<[StateTypes.Session, StateTypes.RenderableState]> {

  if (StateTypes.isBranchingState(state) && !StateTypes.isRenderableState(state)) {
    return state.transitionOut(callSession, inputData).then(([newSession, nextState]) => {
      return resolveBranches(nextState, newSession);
    });
  }

  return Promise.resolve<[StateTypes.Session, StateTypes.RenderableState]>([callSession, state]);
}

export function getSessionData(req: express.Request) {
  return (req.callSession && req.callSession.data) || Immutable.Map<string, any>();
}

/**
 * Takes a state that we want to render (after following non-renderable
 * branching states to a renderable one, if need be), and does all the work
 * needed to render it, namely: 1) following the branches and persisting any
 * changes they make to the session; then 2) calling twimlFor and, if the
 * renderable state is also an asynchronous state, backgroundTrigger; and 3)
 * trying to do robust error handling.
 *
 * The state passed to this function is found in one of two ways: it's either
 * a routable state (i.e., has been requested directly), or it's one a previous
 * state's transitionOut function told us to render next. In the latter case,
 * we've already used the user input to do the state transition, so the inputData
 * argument to this function should be undefined.
 *
 * @param  {StateTypes.UsableState} state The state to render, or to use
 *   to find the one to render.
 * @param {express.Request} req The express request
 * @param {StateTypes.Session} session The session data (passed in because the
 *   data saved in req.callSession may not be the latest).
 * @param {urlFor} furl A function to generate fingerprinted uris for static files.
 * @param {CallDataTwiml | undefined} inputData Data we should pass to the first
 *   state that we encounter on our way to rendering the final state. Note: if
 *   the state passed in as `state` wasn't requested directly (see above comment),
 *   then the user input will have already been used to transition out, and
 *   inputData should be undefined.
 * @return {TwimlResponse} The rendered next state.
 */
export function renderState(state: StateTypes.UsableState, req: express.Request,
  session: StateTypes.Session, furl: furl, inputData: CallDataTwiml | undefined) {

  // A utility function to help our states generate urls.
  const urlForBound = urlFor(req.protocol, req.get('Host'), furl);

  // If this state is non-renderable, follow the branches until we get
  // to a renderable state. When we are at that point, save the session,
  // in the form it's been modified in by the branches. That way, the
  // final session is persisted before we render the state. (Rendering the
  // state before persisting would increase the odds of a race condition,
  // if the user interacted with the rendered state to trigger a new POST.)
  // Note: if the session was already saved as is, it won't be resaved.
  // Once the session is saved (or that's failed), promise the state to render.
  const renderableStatePromise = resolveBranches(state, session, inputData)
    .then(([updatedSession, nextState]) => {
      return req.callSession.save(updatedSession.get('callSid'), updatedSession)
        .then(updatedSessionSaved => {
          session = updatedSessionSaved;
          return nextState;
        }, (e: Error) => {
          logger.error(`Error while saving the updated session.`, e.message);
          return nextState;
        })
    });

  // Now that we have our renderable state, we need to render it.
  // Below, if our stateToRender was arrived at through a branch, then the
  // inputData was already used by resolveBranches above as input to that branch,
  // so we don't want to use it again in backgroundTrigger/twimlFor. So, we
  // determine whether we used the input earlier by checking whether *the state
  // we started with* is renderable. If so, then, when we must be rendering it
  // directly without having passed through any branches, so we use the inputData.
  // Otherwise, we scrap it.
  return renderableStatePromise.then(stateToRender => {
    const inputToUse = StateTypes.isRenderableState(state) ? inputData : undefined;

    if (StateTypes.isAsynchronousState(stateToRender)) {
      logger.info("Began asynchronous processing for " + stateToRender.name);
      stateToRender.backgroundTrigger(session, urlForBound, inputToUse);
    }

    logger.info("Produced twiml for for " + stateToRender.name);
    return stateToRender.twimlFor(session, urlForBound, inputToUse);
  }, (e: Error) => {
    logger.error(`Error while walking the branches.`, e.message);
    throw e;
  });
}

export type furl = (it: string) => string;
export type urlFor = (path: string, options?: UrlForOptions) => string;
export type UrlForOptions = {query?: any, fingerprint?: boolean, absolute?: boolean};

export function urlFor(protocol: string, host: string, furl: furl): urlFor {
  return (path: string, { query, absolute = false, fingerprint }: UrlForOptions = {}) => {
    // Static files are the only ones that can be fingerprinted, and they
    // shouldn't have query parameters. Enforcing this simplies the logic below.
    if(fingerprint && query) {
      throw new Error("Can't combine fingerprinting with query parameters.");
    }

    // Default fingerprint to true...unless we have a query, per above.
    if(fingerprint === undefined) {
      fingerprint = !query;
    }

    if(fingerprint) {
      let fingerprintedRelativeUri = furl(path);

      if(absolute) {
        const relativeUriParts = url.parse(fingerprintedRelativeUri);

        return url.format({
          protocol: protocol,
          host: host,
          pathname: relativeUriParts.pathname,
          search: relativeUriParts.search
        });
      }

      return fingerprintedRelativeUri;
    }
    else {
      const formatOptions = {pathname: path, query: query || undefined};
      if(absolute) {
        (<any>formatOptions).protocol = protocol;
        (<any>formatOptions).host = host;
      }

      return url.format(formatOptions);
    }
  }
};
