import path = require("path");
import express = require("express");
import { Handler } from "express";
import { TwimlResponse } from "twilio";
import { makeUrlFor, fingerprintUrl as furl, urlFor } from "../urlFor";
import { makeServingMiddlewareAndFurl, getFingerprintForFile } from "./staticExpiryHelpers";

/**
 * This function generates the middlewares that will be used to serve static
 * files and the function that we'll use to fingerprint (static file) urls.
 * Those two things are created together because the middlewares will process
 * requests for the fingerprinted urls, and so generally must be aware of/
 * different depending on the fingerprinting strategy. (Also, the static-expiry
 * package, which we use to provide much of this functionality, couples those
 * two concerns together.)
 *
 * Because the hold music endpoint is sort of a special case as a static file
 * and as far as how it needs to be fingerprinted, this function also needs to
 * know about the hold music setup.
 *
 * @param {StaticFilesConfig} staticFilesConfig Static file settings.
 * @return {[Handler[], furl]} The middlewares and fingerprinting function.
 */
type MiddlewaresAndFurl = [Handler[], furl];
export default function(options: StaticFilesConfig): MiddlewaresAndFurl {
  const staticFilesMountPath = options.mountPath || "";
  let [serveStaticMiddlewares, urlFingerprinter] = (() => { // tslint:disable-line
    // If the user's given us both of a way to generate fingerprinted urls
    // and to serve the static files, that's sufficient to totally obviate
    // the built in static expiry middleware and configure urlFor.
    if (options.fingerprintUrl && options.middleware) {
      return <MiddlewaresAndFurl>[[options.middleware], options.fingerprintUrl];
    }

    // But a path works too, with the option for them to override the middleware.
    else if(options.path) {
      const [defaultMiddleware, furl] =
        makeServingMiddlewareAndFurl(staticFilesMountPath, options.path);

      // user's middleware always overrides, even if we're using built-in furl.
      const middleware = options.middleware ?
        [options.middleware] :
        defaultMiddleware;

      return <MiddlewaresAndFurl>[middleware, furl];
    }

    else {
      throw new Error(
        "To use twilio-ivr's built-in static files handling, you must set " +
        "either the path option or the fingerprintUrl and middleware options."
      );
    }
  })();

  // If the hold music endpoint is configured, we have to modify our
  // middlewares and furl function to account for that endpoint. So, this if
  // branch mutates the serveStaticMiddleware and urlFingerprinter vars set above.
  if (options.holdMusic) {
    const holdMusicFileUri = options.holdMusic.fileRelativeUri;
    const holdMusicEndpoint = options.holdMusic.endpoint || "/hold-music";
    const holdMusicEndpointMounted = path.normalize(staticFilesMountPath + '/' + holdMusicEndpoint);
    const holdMusicTwimlFor = options.holdMusic.twimlFor ||
      ((urlFor: urlFor) =>
        (new TwimlResponse()).play({ loop: 1000 }, urlFor(
          path.normalize(staticFilesMountPath + '/' + holdMusicFileUri), { absolute: true }
        )));

    if(!holdMusicFileUri) {
      throw new Error("You must provide a relative uri to your hold music file.");
    }

    // If the built-in furl is in use, make it fingerpint the hold music
    // endpoint with the current fingerprint of the file at holdMusicPath,
    // so both expire at the same time. (If the user provided their own
    // fingerprinting function, they have to make sure it handles the hold
    // music endpoint on their own.)
    if(!options.fingerprintUrl) {
      const origUrlFingerprinter = urlFingerprinter;
      const musicFileFingerprint = (() => {
        try {
          return getFingerprintForFile(holdMusicFileUri);
        }
        catch (e) {
          throw new Error("Your hold music file could not be found.");
        }
      })();

      urlFingerprinter = (path: string) => {
        return (path === holdMusicEndpointMounted) ?
          `${holdMusicEndpointMounted}?v=${musicFileFingerprint}` :
          origUrlFingerprinter(path);
      };
    }

    // Define the middleware for our hold music, which isn't handled as a state
    // because it's not a state conceptually (it doesn't have the transition
    // logic of a normal state, since twilio stops playing it automatically
    // when another party connects to the call, and it's not an end state
    // either) and -- more importantly -- it doesn't fit in with the routing
    // for states because we want twilio to make a cacheable, un-parameterized
    // GET request for it. But it's also not just a static file, because it
    // has dynamic content (i.e., the fingerprint of the hold music file and
    // the host name of the server, because twilio won't accept a relative URI).
    const holdMusicMiddleware = express().get(holdMusicEndpoint, (req, res, next) => {
      const urlFor = makeUrlFor(req.protocol, req.get('Host'), urlFingerprinter);
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(holdMusicTwimlFor(urlFor));
    });

    // Then add the middleware either: at the beginning of the static serving
    // chain, if we're using the built-in static-expiry-derived middleware
    // (because we don't want to try to look up a static file for the hold
    // music endpoint); but at the end if the user has provided their own
    // static files middleware (because we want them to rewrite the
    // fingerprinted url as needed and then call next to get this middleware).
    serveStaticMiddlewares[options.middleware ? "push" : "unshift"](holdMusicMiddleware);
  }

  return [serveStaticMiddlewares, urlFingerprinter];
}

// For the static files config, basically, the user either gives us a
// fingerprintUrl fn and a middleware for handling those urls, or gives us a
// path so we can fall back to using static-expiry + express-static for that.
export type StaticFilesConfig =
  (BuiltinStaticFilesHandlingConfig | CustomStaticFilesHandlingConfig) & {
    readonly mountPath?: string;
    readonly holdMusic?: {
      readonly fileRelativeUri: string;
      readonly endpoint?: string;
      readonly twimlFor?: (urlFor: urlFor) => TwimlResponse | string;
    }
  };

type BuiltinStaticFilesHandlingConfig = {
  readonly path: string;
  readonly middleware?: Handler;
  readonly fingerprintUrl: undefined;
};

type CustomStaticFilesHandlingConfig = {
  readonly path: undefined;
  readonly middleware: Handler;
  readonly fingerprintUrl: furl;
}