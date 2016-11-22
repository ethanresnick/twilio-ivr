import logger from "../logger";
import * as express from "express";
import { CallDataTwiml, TwimlResponse } from "twilio";
import "../twilioAugments";
import url = require("url");

import {
  RenderableState, AsynchronousState, UsableState,
  isRenderableState, isBranchingState, isAsynchronousState
} from "../state";

/**
 * This function takes a state and, while it's branching but not renderable,
 * calls transitionOut repeatedly to get us to the final state that we should
 * render. When it calls transitionOut, it passes input data (if any) the first
 * time, but not on subsequent calls, as subsequent states shouldn't know about
 * any input the user may have passed into the original branching state. With
 * each transitionOut call, it keeps track of the new state, and ultimately
 * returns a promise for that.
 *
 * @param  {UsableState} state The initial state, which may or may
 *   not be renderable.
 * @param  {CallDataTwiml} inputData Any user input taht should be passed to
 *   the initial state, and the initial state only, if it's not renderable.
 * @return {Promise<RenderableState>} The final renderable state.
 */
export function resolveBranches(state: UsableState,
  inputData?: CallDataTwiml): Promise<RenderableState> {

  if (isBranchingState(state) && !isRenderableState(state)) {
    return Promise.resolve(state.transitionOut(inputData)).then(nextState => {
      return resolveBranches(nextState);
    });
  }

  return Promise.resolve(state);
}

/**
 * Takes a state that we want to render (after following non-renderable
 * branching states to a renderable one, if need be), and does all the work
 * needed to render it, namely: 1) doing the branch following; 2) calling
 * twimlFor on the resulting state and, if it's also an asynchronous state,
 * backgroundTrigger; and 3) trying to do robust error handling.
 *
 * The state passed to this function is found in one of two ways: it's either
 * a routable state (i.e., has been requested directly), or it's one a previous
 * state's transitionOut function told us to render next. In the latter case,
 * we've already used the user input to do the state transition, so the inputData
 * argument to this function should be undefined.
 *
 * @param  {UsableState} state The state to render, or to use
 *   to find the one to render.
 * @param {express.Request} req The express request
 * @param {staticFilesMountPath} string The url prefix for static files (where
 *   express.static is mounted).
 * @param {urlFor} furl A function to generate fingerprinted uris for static files.
 * @param {CallDataTwiml|undefined} inputData Data we should pass to the first
 *   state that we encounter on our way to rendering the final state. Note: if
 *   the state passed in as `state` wasn't requested directly (see above comment),
 *   then the user input will have already been used to transition out, and
 *   inputData should be undefined.
 * @return {TwimlResponse|string} The rendered next state.
 */
export function renderState(state: UsableState, req: express.Request,
  staticFilesMountPath: string, furl: furl, inputData: CallDataTwiml | undefined) {

  // A utility function to help our states generate urls.
  const urlForBound = urlFor(req.protocol, req.get('Host'), staticFilesMountPath, furl);

  // If this state is non-renderable, follow the branches until we get
  // to a renderable state.
  const renderableStatePromise = resolveBranches(state, inputData);


  // Below, if our stateToRender was arrived at through a branch, then the
  // inputData was already used by resolveBranches above as input to that branch,
  // so we don't want to use it again in backgroundTrigger/twimlFor. So, we
  // determine whether we used the input earlier by checking whether *the state
  // we started with* is renderable. If so, then, when we must be rendering it
  // directly without having passed through any branches, so we use the inputData.
  // Otherwise, we scrap it.
  const inputToRenderWith = isRenderableState(state) ? inputData : undefined;

  // Now that we have our renderable state, we need to render it.
  return renderableStatePromise.then(stateToRender => {
    if (isAsynchronousState(stateToRender)) {
      logger.info("Began asynchronous processing for " + stateToRender.name);
      stateToRender.backgroundTrigger(urlForBound, inputToRenderWith);
    }

    logger.info("Produced twiml for for " + stateToRender.name);
    return stateToRender.twimlFor(urlForBound, inputToRenderWith);
  }, (e: Error) => {
    logger.error(`Error while walking the branches.`, e.message);
    throw e;
  });
}

export type furl = (it: string) => string;
export type urlFor = (path: string, options?: UrlForOptions) => string;
export type UrlForOptions = {query?: any, fingerprint?: boolean, absolute?: boolean};

export function urlFor(protocol: string, host: string, mountPath: string, furl: furl): urlFor {
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
      // furl doesn't understand the concept of a static files mount path,
      // because static-expiry is built for connect, and a mount path is an
      // abstraction added at the express level. So, we have to remove the
      // mount path if any [sometimes there is none for static files, and some
      // urls that get fingerprinted don't use it anyway (namely for the hold
      // music url)] before furling, and then add it back afterwards.
      let mountPathWithTrailingSlash = mountPath.replace(/\/$/, "") + "/";
      let fingerprintedRelativeUri = path.startsWith(mountPathWithTrailingSlash) ?
        mountPath + furl(path.substr(mountPath.length)) :
        furl(path);

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
