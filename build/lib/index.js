"use strict";
const StateTypes = require("./state");
const routeCreationHelpers_1 = require("./util/routeCreationHelpers");
const objectValuesEntries_1 = require("./util/objectValuesEntries");
const express = require("express");
const bodyParser = require("body-parser");
const expiry = require("static-expiry");
const url = require("url");
const twilio_1 = require("twilio");
require("./lib/twilioAugments");
function default_1(states, config) {
    const app = express();
    objectValuesEntries_1.entries(config.express).forEach(([key, value]) => app.set(key, value));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(twilio_1.webhook(config.twilio.authToken, { validate: config.twilio.validate }));
    var staticHandlers = express();
    staticHandlers.use(expiry(app, {
        location: 'query',
        loadCache: 'startup',
        dir: config.staticFiles.path
    }));
    staticHandlers.use(express.static(config.staticFiles.path, { maxAge: '2y' }));
    if (config.staticFiles.mountPath) {
        app.use(config.staticFiles.mountPath, staticHandlers);
    }
    else {
        app.use(staticHandlers);
    }
    if (config.staticFiles.holdMusic) {
        const { path, loopCount = 500, endpoint } = config.staticFiles.holdMusic;
        const versionedHoldMp3Url = expiry.urlCache[path];
        const currMp3Version = url.parse(versionedHoldMp3Url, true).query.v;
        const versionedHoldMusicUrl = `${endpoint}?v=${currMp3Version}`;
        expiry.urlCache[endpoint] = versionedHoldMusicUrl;
        expiry.assetCache[versionedHoldMusicUrl] =
            Object.assign({}, expiry.assetCache[versionedHoldMp3Url], { assetUrl: endpoint });
        app.get(endpoint, (req, res, next) => {
            const holdUrl = url.format({
                protocol: req.protocol,
                host: req.get('Host'),
                pathname: path,
                query: { v: req.query.v }
            });
            res.set('Cache-Control', 'public, max-age=31536000');
            res.send((new twilio_1.TwimlResponse()).play({ loop: loopCount }, holdUrl));
        });
    }
    states.forEach(thisState => {
        if (!StateTypes.isValidState(thisState)) {
            const stateAsString = (thisState && thisState.name) || String(thisState);
            throw new Error("Invalid state provided: " + stateAsString);
        }
        if (StateTypes.isRoutableState(thisState)) {
            app.post(thisState.uri, function (req, res, next) {
                routeCreationHelpers_1.renderState(thisState, req, app.locals.furl, req.body).then(twiml => {
                    res.send(twiml);
                }, next);
            });
        }
        if (StateTypes.isNormalState(thisState)) {
            app.post(thisState.processTransitionUri, function (req, res, next) {
                const nextStatePromise = Promise.resolve(thisState.transitionOut(req.body));
                nextStatePromise.then(nextState => {
                    routeCreationHelpers_1.renderState(nextState, req, app.locals.furl, undefined).then(twiml => {
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
