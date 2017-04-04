"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function filesConfig(obj) {
    return {
        twilio: { authToken: "", validate: false },
        staticFiles: obj
    };
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
