/**
 * This file contains helper functions that wrap the functionality in the
 * static-expiry module to make it more suitable for our needs.
 */
import { Application, Handler } from "express";
import { fingerprintUrl as furl } from "./routeCreationHelpers";
import url = require("url");
import path = require("path");
import express = require("express");
import expiry = require("static-expiry");

export function makeServingMiddlewareAndFurl(app: Application, mountPath: string, staticFilesPath: string): [Handler[], furl] {
  let oneYearInSeconds = (60 * 60 * 24 * 365);

  let staticExpiryOpts: expiry.config = {
    location: 'query',
    loadCache: 'startup',

    // The whole point of fingerprinted urls is that you can always
    // safely use caching headers, even in development, so let's do that.
    unconditional: "both",
    conditional: "both",
    duration: oneYearInSeconds,

    // static-expiry is kinda naive about how it generates cache keys.
    // In particular, it just takes the absolute path to the file and
    // strips off the first options.dir.length characters. So, if we provide
    // a dir option ending with a `/` we get a different cache key than if
    // we don't. So, below, we normalize the dir we pass in to always end
    // without a slash, so that the cache key always starts with a slash.
    dir: staticFilesPath.replace(/\/$/, '')
  };

  // We need to create the middleware below before reading app.locals.furl,
  // because expiry actually adds the furl function as a side effect. Annoying.
  let middlewares = [
    expiry(app, staticExpiryOpts),
    express.static(staticFilesPath, { maxAge: oneYearInSeconds*1000, index: false })
  ];

  let furl = mountPathAwareFurl(mountPath, app.locals.furl);

  return [middlewares, furl];
}

export function getFingerprintForFile(relativeFilePath: string) {
  const fileCacheKey = path.resolve("/", relativeFilePath);
  const origFingerprintedUrl = (<expiryReal>(<any>expiry)).urlCache[fileCacheKey];

  if(origFingerprintedUrl === undefined) {
    throw new Error("Fingerprint could not be found for file: " + relativeFilePath);
  }

  return url.parse(origFingerprintedUrl, true).query.v;
}

/**
 * furl doesn't understand the concept of a static files mount path, because
 * static-expiry is built for connect, and a mount path is an abstraction added
 * at the express level. So here we create a function that strips the mount path
 * from the start of the url (if present) before invoking static-expiry's furl.
 */
function mountPathAwareFurl(mountPath: string, furl: furl): furl {
  let mountPathWithTrailingSlash = mountPath.replace(/\/$/, "") + "/";

  // Remove the mount path if any [sometimes there is none for static files]
  // before furling, and then add it back afterwards.
  return function(path) {
    return path.startsWith(mountPathWithTrailingSlash) ?
      mountPath + furl(path.substr(mountPath.length)) :
      furl(path);
  }
}

// We sometimes need to peek into the caches that are really
// part of the private expiry api, so I document them here.
type expiryReal = {
  urlCache: { [plainUrl: string]: string };
  assetCache: {
    [fingerprintedUrl: string]:
      { assetUrl: string, lastModified: string, etag: string }
  }
}
