"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
exports.createUrlForFromConfig = (config) => (furl) => (req) => {
    const host = config.host(req);
    const protocol = config.scheme ? config.scheme(req) : req.protocol;
    return makeUrlFor(protocol, host, furl);
};
function makeUrlFor(defaultScheme, defaultHost, furl) {
    return (path, { query, absolute = false, fingerprint, host, scheme } = {}) => {
        if (fingerprint && query) {
            throw new Error("Can't combine fingerprinting with query parameters.");
        }
        if (fingerprint === undefined) {
            fingerprint = (!!furl && !query);
        }
        if (fingerprint) {
            if (!furl) {
                throw new Error("You must provide a fingerprinting function to generate " +
                    "fingerprinted urls.");
            }
            const fingerprintedRelativeUri = furl(path);
            if (absolute) {
                const relativeUriParts = url.parse(fingerprintedRelativeUri);
                return url.format({
                    protocol: scheme || defaultScheme,
                    host: host || defaultHost,
                    pathname: relativeUriParts.pathname,
                    search: relativeUriParts.search
                });
            }
            return fingerprintedRelativeUri;
        }
        else {
            const formatOptions = { pathname: path, query: query || undefined };
            if (absolute) {
                formatOptions.protocol = scheme || defaultScheme;
                formatOptions.host = host || defaultHost;
            }
            return url.format(formatOptions);
        }
    };
}
exports.makeUrlFor = makeUrlFor;
;
