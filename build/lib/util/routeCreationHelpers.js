"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
const state_1 = require("../state");
require("../twilioAugments");
const state_2 = require("../state");
function resolveBranches(state, inputData) {
    if (state_2.isBranchingState(state) && !state_2.isRenderableState(state)) {
        return Promise.resolve(state.transitionOut(inputData)).then(nextState => {
            return resolveBranches(nextState);
        });
    }
    return Promise.resolve(state);
}
exports.resolveBranches = resolveBranches;
function renderState(state, req, createUrlForFromReq, inputData) {
    const urlFor = createUrlForFromReq(req);
    const renderableStatePromise = resolveBranches(state, inputData);
    const inputToRenderWith = state_2.isRenderableState(state) ? inputData : undefined;
    const couldNotFindRenderableStateError = Symbol();
    return renderableStatePromise.then(stateToRender => {
        const stateName = state_1.stateToString(stateToRender);
        if (state_2.isAsynchronousState(stateToRender)) {
            logger_1.default.info("Began asynchronous processing for " + stateName);
            stateToRender.backgroundTrigger(urlFor, inputToRenderWith);
        }
        logger_1.default.info("Produced twiml for " + stateName);
        return stateToRender.twimlFor(urlFor, inputToRenderWith);
    }, (e) => {
        throw { type: couldNotFindRenderableStateError, origError: e };
    }).catch((e) => {
        const origStateName = state_1.stateToString(state);
        const errorToString = (err) => (err && err.message) || String(err);
        const [errorToThrow, genericMessageForErrorType] = (e && e.type === couldNotFindRenderableStateError) ?
            [e.origError, `Error while attempting to find the next state to render after ${origStateName}.`] :
            [e, `Error while attempting to render next state after ${origStateName}.`];
        const specificMessageFromThisError = errorToString(errorToThrow);
        logger_1.default.error(genericMessageForErrorType, specificMessageFromThisError);
        throw errorToThrow;
    });
}
exports.renderState = renderState;
