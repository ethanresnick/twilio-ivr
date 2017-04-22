"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
const state_1 = require("../state");
const staticExpiryHelpers_1 = require("./staticExpiryHelpers");
require("../twilioAugments");
const url = require("url");
const state_2 = require("../state");
function resolveBranches(state, req, inputData) {
    if (state_2.isBranchingState(state) && !state_2.isRenderableState(state)) {
        return Promise.resolve(state.transitionOut(req, inputData)).then(nextState => {
            return resolveBranches(nextState, req);
        });
    }
    return Promise.resolve(state);
}
exports.resolveBranches = resolveBranches;
function renderState(state, req, furl, inputData) {
    const urlForBound = makeUrlFor(req.protocol, req.get('Host'), furl);
    const renderableStatePromise = resolveBranches(state, req, inputData);
    const inputToRenderWith = state_2.isRenderableState(state) ? inputData : undefined;
    const couldNotFindRenderableStateError = Symbol();
    return renderableStatePromise.then(stateToRender => {
        const stateName = state_1.stateToString(stateToRender);
        if (state_2.isAsynchronousState(stateToRender)) {
            logger_1.default.info("Began asynchronous processing for " + stateName);
            stateToRender.backgroundTrigger(urlForBound, req, inputToRenderWith);
        }
        logger_1.default.info("Produced twiml for " + stateName);
        return stateToRender.twimlFor(urlForBound, req, inputToRenderWith);
    }, (e) => {
        throw { type: couldNotFindRenderableStateError, origError: e };
    }).catch((e) => {
        const origStateName = state_1.stateToString(state);
        const errorToString = (err) => err && err.message ? err.message : String(err);
        const [errorToThrow, genericMessageForErrorType] = (e && e.type === couldNotFindRenderableStateError) ?
            [e.origError, `Error while attempting to find the next state to render after ${origStateName}.`] :
            [e, `Error while attempting to render next state after ${origStateName}.`];
        const specificMessageFromThisError = errorToString(errorToThrow);
        logger_1.default.error(genericMessageForErrorType, specificMessageFromThisError);
        throw errorToThrow;
    });
}
exports.renderState = renderState;
function makeUrlFor(protocol, host, furl) {
    return (path, { query = {}, absolute = false, fingerprint } = {}) => {
        if (fingerprint && query) {
            throw new Error("Can't combine fingerprinting with query parameters.");
        }
        if (fingerprint === undefined) {
            fingerprint = (!!furl && !query);
        }
        if (fingerprint) {
            if (!furl) {
                throw new Error("You must provide a fingerprinting function to generate " +
                    "fingerprinted urls.");
            }
            let fingerprintedRelativeUri;
            try {
                fingerprintedRelativeUri = furl(path);
            }
            catch (e) {
                if (e instanceof staticExpiryHelpers_1.UrlToFingerprintNotUnderMountPathError) {
                    e.message +=
                        ' Most likely, you forgot to set the `fingerprint` option to false.';
                }
                throw e;
            }
            if (absolute) {
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
            const formatOptions = { pathname: path, query: query || undefined };
            if (absolute) {
                formatOptions.protocol = protocol;
                formatOptions.host = host;
            }
            return url.format(formatOptions);
        }
    };
}
exports.makeUrlFor = makeUrlFor;
;
