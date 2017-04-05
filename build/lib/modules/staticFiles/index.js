"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const express = require("express");
const twilio_1 = require("twilio");
const urlFor_1 = require("../urlFor");
const staticExpiryHelpers_1 = require("./staticExpiryHelpers");
function default_1(options) {
    const staticFilesMountPath = options.mountPath || "";
    let [serveStaticMiddlewares, urlFingerprinter] = (() => {
        if (options.fingerprintUrl && options.middleware) {
            return [[options.middleware], options.fingerprintUrl];
        }
        else if (options.path) {
            const [defaultMiddleware, furl] = staticExpiryHelpers_1.makeServingMiddlewareAndFurl(staticFilesMountPath, options.path);
            const middleware = options.middleware ?
                [options.middleware] :
                defaultMiddleware;
            return [middleware, furl];
        }
        else {
            throw new Error("To use twilio-ivr's built-in static files handling, you must set " +
                "either the path option or the fingerprintUrl and middleware options.");
        }
    })();
    if (options.holdMusic) {
        const holdMusicFileUri = options.holdMusic.fileRelativeUri;
        const holdMusicEndpoint = options.holdMusic.endpoint || "/hold-music";
        const holdMusicEndpointMounted = path.normalize(staticFilesMountPath + '/' + holdMusicEndpoint);
        const holdMusicTwimlFor = options.holdMusic.twimlFor ||
            ((urlFor) => (new twilio_1.TwimlResponse()).play({ loop: 1000 }, urlFor(path.normalize(staticFilesMountPath + '/' + holdMusicFileUri), { absolute: true })));
        if (!holdMusicFileUri) {
            throw new Error("You must provide a relative uri to your hold music file.");
        }
        if (!options.fingerprintUrl) {
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
            const urlFor = urlFor_1.makeUrlFor(req.protocol, req.get('Host'), urlFingerprinter);
            res.set('Cache-Control', 'public, max-age=31536000');
            res.send(holdMusicTwimlFor(urlFor));
        });
        serveStaticMiddlewares[options.middleware ? "push" : "unshift"](holdMusicMiddleware);
    }
    return [serveStaticMiddlewares, urlFingerprinter];
}
exports.default = default_1;
