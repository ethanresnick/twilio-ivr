"use strict";
const url = require("url");
const path = require("path");
const express = require("express");
const expiry = require("static-expiry");
function makeServingMiddlewareAndFurl(app, mountPath, staticFilesPath) {
    let oneYearInSeconds = (60 * 60 * 24 * 365);
    let staticExpiryOpts = {
        location: 'query',
        loadCache: 'startup',
        unconditional: "both",
        conditional: "both",
        duration: oneYearInSeconds,
        dir: staticFilesPath.replace(/\/$/, '')
    };
    let middlewares = [
        expiry(app, staticExpiryOpts),
        express.static(staticFilesPath, { maxAge: oneYearInSeconds * 1000, index: false })
    ];
    let furl = mountPathAwareFurl(mountPath, app.locals.furl);
    return [middlewares, furl];
}
exports.makeServingMiddlewareAndFurl = makeServingMiddlewareAndFurl;
function getFingerprintForFile(relativeFilePath) {
    const fileCacheKey = path.resolve("/", relativeFilePath);
    const origFingerprintedUrl = expiry.urlCache[fileCacheKey];
    if (origFingerprintedUrl === undefined) {
        throw new Error("Fingerprint could not be found for file: " + relativeFilePath);
    }
    return url.parse(origFingerprintedUrl, true).query.v;
}
exports.getFingerprintForFile = getFingerprintForFile;
function mountPathAwareFurl(mountPath, furl) {
    const mountPathWithTrailingSlash = mountPath.replace(/\/$/, "") + "/";
    if (mountPath === '/') {
        mountPath = '';
    }
    return (path) => {
        if (!path.startsWith(mountPathWithTrailingSlash)) {
            throw new UrlToFingerprintNotUnderMountPathError(path, mountPath);
        }
        return mountPath + furl(path.substr(mountPath.length));
    };
}
class UrlToFingerprintNotUnderMountPathError extends Error {
    constructor(path, mountPath) {
        super(`You tried to fingerprint a url (${path}) whose path isn\'t under the` +
            `static files mount path (${mountPath}). However, when using the built-in ` +
            'fingerprint function, only urls for static files can be fingerprinted, ' +
            'and all static files have their URL under the static files mount path.');
    }
}
exports.UrlToFingerprintNotUnderMountPathError = UrlToFingerprintNotUnderMountPathError;
;
