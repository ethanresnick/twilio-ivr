"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TWILIO_CONFIG = {
    twilio: { authToken: "", validate: false }
};
exports.DEFAULT_URLFOR_CONFIG = {
    urlFor: { host() { return '127.0.0.1'; } }
};
exports.DEFAULT_CONFIG = Object.assign({}, exports.DEFAULT_TWILIO_CONFIG, exports.DEFAULT_URLFOR_CONFIG);
function filesConfig(obj) {
    return Object.assign({}, exports.DEFAULT_CONFIG, { staticFiles: obj });
}
exports.filesConfig = filesConfig;
function stateRenderingUrlFor(urlToRender, stateUri) {
    return {
        name: "URL_FOR_TEST",
        uri: stateUri,
        isEndState: true,
        twimlFor(urlFor, input) {
            return urlFor(urlToRender);
        }
    };
}
exports.stateRenderingUrlFor = stateRenderingUrlFor;
