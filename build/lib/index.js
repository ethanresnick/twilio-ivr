"use strict";
const StateTypes = require("./state");
const routeCreationHelpers_1 = require("./util/routeCreationHelpers");
const bodyParser = require("body-parser");
const expiry = require("static-expiry");
const session_1 = require("./session");
const express = require("express");
const twilio_1 = require("twilio");
require("./lib/twilioAugments");
require("./lib/polyfillObjectValuesEntries");
const url = require("url");
const sessionStorePromise = Promise.resolve().then((sequelize) => {
    return new session_1.Store();
}, (err) => {
    throw err;
});
function default_1(states, appConfig, twilioConfig) {
    const app = express();
    Object.entries(appConfig).forEach(([key, value]) => app.set(key, value));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(twilio_1.webhook(twilioConfig.authToken, { validate: twilioConfig.validate }));
    app.use(expiry(app, {
        location: 'query',
        loadCache: 'startup',
        dir: 'some dir',
        conditional: config.get("env:development") ? "none" : "both",
        unconditional: config.get("env:development") ? "none" : "both"
    }));
    app.use(express.static('public', { maxAge: '1y' }));
    const versionedHoldMp3Url = expiry.urlCache['/hold.mp3'];
    const currMp3Version = url.parse(versionedHoldMp3Url, true).query.v;
    const versionedHoldMusicUrl = '/hold-music?v=' + currMp3Version;
    expiry.urlCache['/hold-music'] = versionedHoldMusicUrl;
    expiry.assetCache[versionedHoldMusicUrl] =
        Object.assign({}, expiry.assetCache[versionedHoldMp3Url], { assetUrl: '/hold-music' });
    app.get("/hold-music", (req, res, next) => {
        const holdUrl = url.format({
            protocol: req.protocol,
            host: req.get('Host'),
            pathname: "/hold.mp3",
            query: { v: req.query.v }
        });
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send((new twilio_1.TwimlResponse()).play({ loop: 100 }, holdUrl));
    });
    app.use(session_1.middleware({ store: callSessionStore }));
    states.forEach(thisState => {
        if (!StateTypes.isValidState(thisState)) {
            const stateAsString = (thisState && thisState.name) || String(thisState);
            throw new Error("Invalid state provided: " + stateAsString);
        }
        if (StateTypes.isRoutableState(thisState)) {
            app.post(thisState.uri, function (req, res, next) {
                routeCreationHelpers_1.renderState(thisState, req, routeCreationHelpers_1.getSessionData(req), app.locals.furl, req.body).then(twiml => {
                    res.send(twiml);
                }, next);
            });
        }
        if (StateTypes.isNormalState(thisState)) {
            app.post(thisState.processTransitionUri, function (req, res, next) {
                const resultStateAndSessionPromise = thisState.transitionOut(routeCreationHelpers_1.getSessionData(req), req.body);
                resultStateAndSessionPromise.then(([updatedSession, resultState]) => {
                    routeCreationHelpers_1.renderState(resultState, req, updatedSession, app.locals.furl, undefined).then(twiml => {
                        res.send(twiml);
                    }, next);
                });
            });
        }
    });
    return app;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
sessionStorePromise.then(callSessionStore => { });
