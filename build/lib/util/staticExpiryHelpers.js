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
    let mountPathWithTrailingSlash = mountPath.replace(/\/$/, "") + "/";
    return function (path) {
        return path.startsWith(mountPathWithTrailingSlash) ?
            mountPath + furl(path.substr(mountPath.length)) :
            furl(path);
    };
}
