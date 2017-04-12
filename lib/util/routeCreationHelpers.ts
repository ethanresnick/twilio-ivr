import logger from "../logger";
import * as express from "express";
import { CallDataTwiml } from "twilio";
import { stateToString } from "../state";
import { UrlToFingerprintNotUnderMountPathError } from "./staticExpiryHelpers";
import "../twilioAugments";
import url = require("url");

import {
  RenderableState, UsableState,
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
 * @param  {express.Request} req The express request
 * @param  {CallDataTwiml} inputData Any user input taht should be passed to
 *   the initial state, and the initial state only, if it's not renderable.
 * @return {Promise<RenderableState>} The final renderable state.
 */
export function resolveBranches(state: UsableState, req: express.Request, inputData?: CallDataTwiml): Promise<RenderableState> {
  if (isBranchingState(state) && !isRenderableState(state)) {
    return Promise.resolve(state.transitionOut(req, inputData)).then(nextState => {
      return resolveBranches(nextState, req);
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
 * @param {fingerprintUrl|undefined} furl A function to generate fingerprinted
 *   uris for static files.
 * @param {CallDataTwiml|undefined} inputData Data we should pass to the first
 *   state that we encounter on our way to rendering the final state. Note: if
 *   the state passed in as `state` wasn't requested directly (see above comment),
 *   then the user input will have already been used to transition out, and
 *   inputData should be undefined.
 * @return {TwimlResponse|string} The rendered next state.
 */
export function renderState(state: UsableState, req: express.Request,
  furl: fingerprintUrl | undefined, inputData: CallDataTwiml | undefined) {

  // A utility function to help our states generate urls.
  const urlForBound = makeUrlFor(req.protocol, req.get('Host'), furl);

  // If this state is non-renderable, follow the branches until we get
  // to a renderable state.
  const renderableStatePromise = resolveBranches(state, req, inputData);


  // Below, if our stateToRender was arrived at through a branch, then the
  // inputData was already used by resolveBranches above as input to that branch,
  // so we don't want to use it again in backgroundTrigger/twimlFor. So, we
  // determine whether we used the input earlier by checking whether *the state
  // we started with* is renderable. If so, then, when we must be rendering it
  // directly without having passed through any branches, so we use the inputData.
  // Otherwise, we scrap it.
  const inputToRenderWith = isRenderableState(state) ? inputData : undefined;

  // A value we need for error handling below.
  const couldNotFindRenderableStateError = Symbol();

  // Now that we have our renderable state, we need to render it.
  return renderableStatePromise.then(stateToRender => {
    const stateName = stateToString(stateToRender);
    if (isAsynchronousState(stateToRender)) {
      logger.info("Began asynchronous processing for " + stateName);
      stateToRender.backgroundTrigger(urlForBound, req, inputToRenderWith);
    }

    logger.info("Produced twiml for " + stateName);
    return stateToRender.twimlFor(urlForBound, req, inputToRenderWith);
  }, (e: Error) => {
    // Here, we got an error while finding the next state to render (because
    // renderableStatePromise rejected) and we want to re-throw it, because we
    // can't recover from it and we ultimately want to get it to the outside
    // world for handling (i.e., we don't want to swallow it). But, if we just
    // rethrow it as is, that will still trigger the catch block below (by
    // creating a new rejected promise), and that catch block won't have any way
    // to know whether the error its operating on came from here or from the
    // then() block above. So, to distinguish between those cases, we type the
    // error here with a symbol, which we can check for below.
    throw { type: couldNotFindRenderableStateError, origError: e };
  }).catch((e: Error) => {
    // Find whether the error came from attempting to find the state to render,
    // or from attempting to render it. Then log the error and re-throw it.
    const origStateName = stateToString(state);
    const errorToString = (err: any) => err && err.message ? err.message : String(err);

    const [errorToThrow, genericMessageForErrorType] =
      (e && (<any>e).type === couldNotFindRenderableStateError) ?
        [(<any>e).origError, `Error while attempting to find the next state to render after ${origStateName}.`] :
        [e, `Error while attempting to render next state after ${origStateName}.`];

    const specificMessageFromThisError = errorToString(errorToThrow);
    logger.error(genericMessageForErrorType, specificMessageFromThisError);
    throw errorToThrow;
  });
}

export type fingerprintUrl = (path: string) => string;
export type urlFor = (path: string, options?: UrlForOptions) => string;
export type UrlForOptions = { query?: any, fingerprint?: boolean, absolute?: boolean };

/**
 * This function produces the urlFor function that is actually passed to each state.
 * @param {string} protocol The protocol to include when generating absolute urls.
 * @param {string} host The host to include when generating absolute urls.
 * @param {fingerprintUrl} furl The function used to actually fingerprint a root-relative url.
 * @return {urlFor} A final function, with options, for fingerpinting a root-relative url.
 */
export function makeUrlFor(protocol: string, host: string, furl?: fingerprintUrl): urlFor {
  return (path: string, { query = {}, absolute = false, fingerprint }: UrlForOptions = {}) => {
    // Static files are the only ones that can be fingerprinted, and they
    // shouldn't have query parameters. Enforcing this simplies the logic below.
    if(fingerprint && query) {
      throw new Error("Can't combine fingerprinting with query parameters.");
    }

    // Default fingerprint to true...if we have a fingerprinting function
    // and unless we have a query, per above.
    if(fingerprint === undefined) {
      fingerprint = (!!furl && !query);
    }

    if(fingerprint) {
      // if the user's asking for a fingerprinted url, but urlFor
      // wasn't created with a function for doing the fingerprinting, throw.
      if(!furl) {
        throw new Error(
          "You must provide a fingerprinting function to generate " +
          "fingerprinted urls."
        );
      }

      let fingerprintedRelativeUri: string;

      try {
        fingerprintedRelativeUri = furl(path);
      }

      catch (e) {
        if(e instanceof UrlToFingerprintNotUnderMountPathError) {
          e.message +=
            ' Most likely, you forgot to set the `fingerprint` option to false.';
        }

        throw e;
      }

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
