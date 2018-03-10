"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const State = require("./state");
const staticExpiryHelpers_1 = require("./util/staticExpiryHelpers");
const routeCreationHelpers_1 = require("./util/routeCreationHelpers");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const twilio = require("twilio");
const VoiceResponse = twilio.twiml.VoiceResponse;
const twilioWebhook = twilio.webhook;
function default_1(states, config) {
    const app = express();
    if (config.trustProxy) {
        app.set('trust proxy', 1);
    }
    if (config.session) {
        app.use(config.session);
    }
    app.use(bodyParser.urlencoded({ extended: false }));
    const { validate = true } = config.twilio;
    app.use(twilioWebhook(config.twilio.authToken, { validate: validate }));
    let urlFingerprinter;
    if (config.staticFiles) {
        const staticFilesMountPath = config.staticFiles.mountPath || "";
        let serveStaticMiddleware;
        [serveStaticMiddleware, urlFingerprinter] = ((staticFilesConf) => {
            if (staticFilesConf.fingerprintUrl && staticFilesConf.middleware) {
                return [[staticFilesConf.middleware], staticFilesConf.fingerprintUrl];
            }
            else if (staticFilesConf.path) {
                const [defaultMiddleware, furl] = staticExpiryHelpers_1.makeServingMiddlewareAndFurl(app, staticFilesMountPath, staticFilesConf.path);
                const middleware = staticFilesConf.middleware ?
                    [staticFilesConf.middleware] :
                    defaultMiddleware;
                return [middleware, furl];
            }
            else {
                throw new Error("To use twilio-ivr's built-in static files handling, you must set " +
                    "either the path option or the fingerprintUrl and middleware options.");
            }
        })(config.staticFiles);
        if (config.staticFiles.holdMusic) {
            const holdMusicFileUri = config.staticFiles.holdMusic.fileRelativeUri;
            const holdMusicEndpoint = config.staticFiles.holdMusic.endpoint || "/hold-music";
            const holdMusicEndpointMounted = path.normalize(staticFilesMountPath + '/' + holdMusicEndpoint);
            const holdMusicTwimlFor = config.staticFiles.holdMusic.twimlFor ||
                ((urlFor) => {
                    const response = new VoiceResponse();
                    response.play({ loop: 1000 }, urlFor(path.normalize(staticFilesMountPath + '/' + holdMusicFileUri), { absolute: true }));
                    return response.toString();
                });
            if (!holdMusicFileUri) {
                throw new Error("You must provide a relative uri to your hold music file.");
            }
            if (!config.staticFiles.fingerprintUrl) {
                const origUrlFingerprinter = urlFingerprinter;
                const musicFileFingerprint = (() => {
                    try {
                        return staticExpiryHelpers_1.getFingerprintForFile(holdMusicFileUri);
                    }
                    catch (e) {
                        throw new Error("Your hold music file could not be found.");
                    }
                })();
                urlFingerprinter = (path) => {
                    return (path === holdMusicEndpointMounted) ?
                        `${holdMusicEndpointMounted}?v=${musicFileFingerprint}` :
                        origUrlFingerprinter(path);
                };
            }
            const holdMusicMiddleware = express().get(holdMusicEndpoint, (req, res, next) => {
                const urlFor = routeCreationHelpers_1.makeUrlFor(req.protocol, req.get('Host'), urlFingerprinter);
                res.set('Cache-Control', 'public, max-age=31536000');
                res.send(holdMusicTwimlFor(urlFor));
            });
            serveStaticMiddleware[config.staticFiles.middleware ? "push" : "unshift"](holdMusicMiddleware);
        }
        app.use(staticFilesMountPath, serveStaticMiddleware);
    }
    states.forEach(thisState => {
        if (!State.isValidState(thisState)) {
            const stateAsString = State.stateToString(thisState);
            throw new Error("Invalid state provided: " + stateAsString);
        }
        if (State.isRoutableState(thisState)) {
            app.post(thisState.uri, function (req, res, next) {
                routeCreationHelpers_1.renderState(thisState, req, urlFingerprinter, req.body)
                    .then(twiml => { res.send(twiml); })
                    .catch(next);
            });
        }
        if (State.isNormalState(thisState)) {
            app.post(thisState.processTransitionUri, function (req, res, next) {
                const nextStatePromise = Promise.resolve(thisState.transitionOut(req, req.body));
                nextStatePromise
                    .then(nextState => {
                    return routeCreationHelpers_1.renderState(nextState, req, urlFingerprinter, req.body);
                })
                    .then(twiml => { res.send(twiml); })
                    .catch(next);
            });
        }
    });
    return app;
}
exports.default = default_1;
