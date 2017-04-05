import url = require("url");
export type fingerprintUrl = (path: string) => string;
export type urlFor = (path: string, options?: UrlForOptions) => string;
export type UrlForOptions = { query?: any, fingerprint?: boolean, absolute?: boolean };

/**
 * This function produces the urlFor function that is actually passed to each
 * state, so that the states can generate the url of another state/static file.
 *
 * @param {string} protocol The protocol to include when generating absolute urls.
 * @param {string} host The host to include when generating absolute urls.
 * @param {fingerprintUrl} furl The function used to actually fingerprint a root-relative url.
 * @return {urlFor} A final function, with options, for fingerpinting a root-relative url.
 *                  Note: this function can error if fingerprinting errors.
 */
export function makeUrlFor(protocol: string, host: string, furl?: fingerprintUrl): urlFor {
  return (path: string, { query, absolute = false, fingerprint }: UrlForOptions = {}) => {
    // Static files are the only ones that can be fingerprinted, and they
    // shouldn't have query parameters. Enforcing this simplies the logic below.
    if(fingerprint && query) {
      throw new Error("Can't combine fingerprinting with query parameters.");
    }

    // Default fingerprint to true...if we have a fingerprinting function
    // and unless we have a query, per above.
    if(fingerprint === undefined) {
      fingerprint = (!!furl && !query);
    }

    if(fingerprint) {
      // if the user's asking for a fingerprinted url, but urlFor
      // wasn't created with a function for doing the fingerprinting, throw.
      if(!furl) {
        throw new Error(
          "You must provide a fingerprinting function to generate " +
          "fingerprinted urls."
        );
      }

      // Note: furl() can throw...
      const fingerprintedRelativeUri = furl(path);

      if(absolute) {
        const relativeUriParts = url.parse(fingerprintedRelativeUri);

        return url.format({
          protocol: protocol,
          host: host,
          pathname: relativeUriParts.pathname,
          search: relativeUriParts.search
        });
      }

      return fingerprintedRelativeUri;
    }

    else {
      const formatOptions = {pathname: path, query: query || undefined};
      if(absolute) {
        (<any>formatOptions).protocol = protocol;
        (<any>formatOptions).host = host;
      }

      return url.format(formatOptions);
    }
  }
};