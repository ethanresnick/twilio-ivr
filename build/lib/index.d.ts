/// <reference types="express" />
import * as StateTypes from "./state";
import { Express } from "express";
import "./lib/twilioAugments";
import "./lib/polyfillObjectValuesEntries";
export declare type config = {
    express: any;
    twilio: {
        authToken: string;
        validate: boolean;
    };
    staticFiles: {
        path: string;
        mountPath?: string;
        holdMusic?: {
            path: string;
            loopCount: number;
            endpoint: string;
        };
    };
};
export default function (states: StateTypes.UsableState[], config: config): Express;
