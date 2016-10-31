"use strict";
const logger_1 = require("../logger");
const Immutable = require("immutable");
const twilio_1 = require("twilio");
require("./lib/twilioAugments");
function default_1({ store }) {
    if (!store) {
        throw new Error("A store is required.");
    }
    return function (req, res, next) {
        if (req.callSession) {
            return next();
        }
        const reqBody = req.body;
        const logIfErrorThenNext = (eOrValue) => {
            if (eOrValue instanceof Error) {
                logger_1.default.error(eOrValue.message);
            }
            next();
        };
        if (!req.body) {
            throw new Error("Load session middleware after body-parsing middleware.");
        }
        if (!twilio_1.isCallDataTwiml(reqBody)) {
            return next();
        }
        let sessionAsSaved;
        function setupSession(session, isNew) {
            const result = [
                { data: session, save: saveSession, destroy: store.destroy.bind(store) },
                isNew ? undefined : session
            ];
            return result;
        }
        function saveSession(id, sessionData) {
            if (!sessionAsSaved || !sessionAsSaved.equals(sessionData)) {
                return store.set(id, immutableToCallSession(sessionData))
                    .then(it => {
                    req.callSession.data = sessionData;
                    sessionAsSaved = sessionData;
                    return req.callSession.data;
                })
                    .catch(e => {
                    logger_1.default.error(`Could not save new call state!`, e);
                    throw e;
                });
            }
            return Promise.resolve(sessionData);
        }
        if (req.query.userCallSid) {
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
        else {
            store.get(reqBody.CallSid).then((callSession) => {
                const session = callSessionToImmutable(callSession || generate(reqBody.CallSid));
                [req.callSession, sessionAsSaved] = setupSession(session, !callSession);
            }).then(logIfErrorThenNext, logIfErrorThenNext);
        }
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function generate(sid) {
    return { callSid: sid };
}
function callSessionToImmutable(session) {
    return Immutable.Map(session);
}
function immutableToCallSession(immutable) {
    return immutable.toJS();
}
