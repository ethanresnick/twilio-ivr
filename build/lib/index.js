"use strict";
const StateTypes = require("./state");
const routeCreationHelpers_1 = require("./util/routeCreationHelpers");
const objectValuesEntries_1 = require("./util/objectValuesEntries");
const express = require("express");
const bodyParser = require("body-parser");
const expiry = require("static-expiry");
const url = require("url");
const path = require("path");
const twilio_1 = require("twilio");
require("./twilioAugments");
function default_1(states, config) {
    const app = express();
    objectValuesEntries_1.entries(config.express || {}).forEach(([key, val]) => app.set(key, val));
    app.use(bodyParser.urlencoded({ extended: false }));
    let { validate = true } = config.twilio;
    app.use(twilio_1.webhook(config.twilio.authToken, { validate: validate }));
    let staticFilesMountPath = (config.staticFiles && config.staticFiles.mountPath) || "";
    if (config.staticFiles) {
        let staticFilesPath = config.staticFiles.path;
        let staticExpiryOpts = {
            location: 'query',
            loadCache: 'startup',
            dir: staticFilesPath.replace(/\/$/, '')
        };
        let serveStatic = config.staticFiles.middleware ||
            express.static(staticFilesPath, { maxAge: '2y' });
        app.use(staticFilesMountPath, [expiry(app, staticExpiryOpts), serveStatic]);
        if (config.staticFiles.holdMusic) {
            const holdMusicPath = config.staticFiles.holdMusic.path;
            const holdMusicCacheKey = "/" + holdMusicPath;
            const holdMusicLoopCount = config.staticFiles.holdMusic.loopCount || 500;
            const holdMusicEndpoint = config.staticFiles.holdMusic.endpoint || "/hold-music";
            if (!holdMusicPath) {
                throw new Error("You must provide a path to your hold music file.");
            }
            else if (!expiry.urlCache[holdMusicCacheKey]) {
                throw new Error("Your hold music file could not be found.");
            }
            const versionedHoldMp3Url = expiry.urlCache[holdMusicCacheKey];
            const currMp3Version = url.parse(versionedHoldMp3Url, true).query.v;
            const versionedHoldMusicUrl = `${holdMusicEndpoint}?v=${currMp3Version}`;
            expiry.urlCache[holdMusicEndpoint] = versionedHoldMusicUrl;
            expiry.assetCache[versionedHoldMusicUrl] =
                Object.assign({}, expiry.assetCache[versionedHoldMp3Url], { assetUrl: holdMusicEndpoint });
            app.get(holdMusicEndpoint, (req, res, next) => {
                const holdUrl = url.format({
                    protocol: req.protocol,
                    host: req.get('Host'),
                    pathname: path.join(staticFilesMountPath, holdMusicPath),
                    query: { v: req.query.v }
                });
                res.set('Cache-Control', 'public, max-age=31536000');
                res.send((new twilio_1.TwimlResponse()).play({ loop: holdMusicLoopCount }, holdUrl));
            });
        }
    }
    states.forEach(thisState => {
        if (!StateTypes.isValidState(thisState)) {
            const stateAsString = (thisState && thisState.name) || String(thisState);
            throw new Error("Invalid state provided: " + stateAsString);
        }
        if (StateTypes.isRoutableState(thisState)) {
            app.post(thisState.uri, function (req, res, next) {
                routeCreationHelpers_1.renderState(thisState, req, staticFilesMountPath, app.locals.furl, req.body).then(twiml => {
                    res.send(twiml);
                }, next);
            });
        }
        if (StateTypes.isNormalState(thisState)) {
            app.post(thisState.processTransitionUri, function (req, res, next) {
                const nextStatePromise = Promise.resolve(thisState.transitionOut(req.body));
                nextStatePromise.then(nextState => {
                    routeCreationHelpers_1.renderState(nextState, req, staticFilesMountPath, app.locals.furl, undefined).then(twiml => {
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
