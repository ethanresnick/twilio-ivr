"use strict";
const StateTypes = require("../state");
const logger_1 = require("../logger");
require("../twilioAugments");
const url = require("url");
function resolveBranches(state, inputData) {
    if (StateTypes.isBranchingState(state) && !StateTypes.isRenderableState(state)) {
        return Promise.resolve(state.transitionOut(inputData)).then(nextState => {
            return resolveBranches(nextState);
        });
    }
    return Promise.resolve(state);
}
exports.resolveBranches = resolveBranches;
function renderState(state, req, furl, inputData) {
    const urlForBound = urlFor(req.protocol, req.get('Host'), furl);
    const renderableStatePromise = resolveBranches(state, inputData);
    return renderableStatePromise.then(stateToRender => {
        const inputToUse = StateTypes.isRenderableState(state) ? inputData : undefined;
        if (StateTypes.isAsynchronousState(stateToRender)) {
            logger_1.default.info("Began asynchronous processing for " + stateToRender.name);
            stateToRender.backgroundTrigger(urlForBound, inputToUse);
        }
        logger_1.default.info("Produced twiml for for " + stateToRender.name);
        return stateToRender.twimlFor(urlForBound, inputToUse);
    }, (e) => {
        logger_1.default.error(`Error while walking the branches.`, e.message);
        throw e;
    });
}
exports.renderState = renderState;
function urlFor(protocol, host, furl) {
    return (path, { query, absolute = false, fingerprint } = {}) => {
        if (fingerprint && query) {
            throw new Error("Can't combine fingerprinting with query parameters.");
        }
        if (fingerprint === undefined) {
            fingerprint = !query;
        }
        if (fingerprint) {
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
exports.urlFor = urlFor;
;
