"use strict";
const StateTypes = require("../lib/state");
const logger_1 = require("../lib/logger");
const Immutable = require("immutable");
require("./lib/twilioAugments");
const url = require("url");
function resolveBranches(state, callSession, inputData) {
    if (StateTypes.isBranchingState(state) && !StateTypes.isRenderableState(state)) {
        return state.transitionOut(callSession, inputData).then(([newSession, nextState]) => {
            return resolveBranches(nextState, newSession);
        });
    }
    return Promise.resolve([callSession, state]);
}
exports.resolveBranches = resolveBranches;
function getSessionData(req) {
    return (req.callSession && req.callSession.data) || Immutable.Map();
}
exports.getSessionData = getSessionData;
function renderState(state, req, session, furl, inputData) {
    const urlForBound = urlFor(req.protocol, req.get('Host'), furl);
    const renderableStatePromise = resolveBranches(state, session, inputData)
        .then(([updatedSession, nextState]) => {
        return req.callSession.save(updatedSession.get('callSid'), updatedSession)
            .then(updatedSessionSaved => {
            session = updatedSessionSaved;
            return nextState;
        }, (e) => {
            logger_1.default.error(`Error while saving the updated session.`, e.message);
            return nextState;
        });
    });
    return renderableStatePromise.then(stateToRender => {
        const inputToUse = StateTypes.isRenderableState(state) ? inputData : undefined;
        if (StateTypes.isAsynchronousState(stateToRender)) {
            logger_1.default.debug("Began asynchronous processing for " + stateToRender.name);
            stateToRender.backgroundTrigger(session, urlForBound, inputToUse);
        }
        logger_1.default.debug("Produced twiml for for " + stateToRender.name);
        return stateToRender.twimlFor(session, urlForBound, inputToUse);
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
