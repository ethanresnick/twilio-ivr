"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
function makeUrlFor(protocol, host, furl) {
    return (path, { query, absolute = false, fingerprint } = {}) => {
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
                    protocol: protocol,
                    host: host,
                    pathname: relativeUriParts.pathname,
                    search: relativeUriParts.search
                });
            }
            return fingerprintedRelativeUri;
        }
        else {
            const formatOptions = { pathname: path, query: query || undefined };
            if (absolute) {
                formatOptions.protocol = protocol;
                formatOptions.host = host;
            }
            return url.format(formatOptions);
        }
    };
}
exports.makeUrlFor = makeUrlFor;
;
