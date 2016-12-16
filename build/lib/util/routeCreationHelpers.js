"use strict";
const logger_1 = require("../logger");
require("../twilioAugments");
const url = require("url");
const state_1 = require("../state");
function resolveBranches(state, inputData) {
    if (state_1.isBranchingState(state) && !state_1.isRenderableState(state)) {
        return Promise.resolve(state.transitionOut(inputData)).then(nextState => {
            return resolveBranches(nextState);
        });
    }
    return Promise.resolve(state);
}
exports.resolveBranches = resolveBranches;
function renderState(state, req, furl, inputData) {
    const urlForBound = makeUrlFor(req.protocol, req.get('Host'), furl);
    const renderableStatePromise = resolveBranches(state, inputData);
    const inputToRenderWith = state_1.isRenderableState(state) ? inputData : undefined;
    return renderableStatePromise.then(stateToRender => {
        if (state_1.isAsynchronousState(stateToRender)) {
            logger_1.default.info("Began asynchronous processing for " + stateToRender.name);
            stateToRender.backgroundTrigger(urlForBound, inputToRenderWith);
        }
        logger_1.default.info("Produced twiml for for " + stateToRender.name);
        return stateToRender.twimlFor(urlForBound, inputToRenderWith);
    }, (e) => {
        logger_1.default.error(`Error while walking the branches.`, e.message);
        throw e;
    });
}
exports.renderState = renderState;
function makeUrlFor(protocol, host, furl) {
    return (path, { query, absolute = false, fingerprint } = {}) => {
        if (fingerprint && query) {
            throw new Error("Can't combine fingerprinting with query parameters.");
        }
        if (fingerprint === undefined) {
            fingerprint = !query;
        }
        if (fingerprint) {
            if (!furl) {
                throw new Error("You must provide a fingerprinting function to generate " +
                    "fingerprinted urls.");
            }
            let fingerprintedRelativeUri = furl(path);
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
