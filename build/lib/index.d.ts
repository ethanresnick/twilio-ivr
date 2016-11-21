/// <reference types="express" />
import * as StateTypes from "./state";
import { Express, Handler } from "express";
import "./twilioAugments";
export declare type config = {
    express?: any;
    twilio: {
        authToken: string;
        validate?: boolean;
    };
    staticFiles?: {
        path: string;
        mountPath?: string;
        holdMusic?: {
            path: string;
            loopCount?: number;
            endpoint?: string;
        };
        middleware?: Handler;
    };
};
export default function (states: StateTypes.UsableState[], config: config): Express;
