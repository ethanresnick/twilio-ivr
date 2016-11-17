/// <reference types="express" />
/// <reference types="twilio" />
import * as StateTypes from "../state";
import * as express from "express";
import { CallDataTwiml, TwimlResponse } from "twilio";
import "../twilioAugments";
export declare function resolveBranches(state: StateTypes.UsableState, inputData?: CallDataTwiml): Promise<StateTypes.RenderableState>;
export declare function renderState(state: StateTypes.UsableState, req: express.Request, furl: furl, inputData: CallDataTwiml | undefined): Promise<string | TwimlResponse>;
export declare type furl = (it: string) => string;
export declare type urlFor = (path: string, options?: UrlForOptions) => string;
export declare type UrlForOptions = {
    query?: any;
    fingerprint?: boolean;
    absolute?: boolean;
};
export declare function urlFor(protocol: string, host: string, furl: furl): urlFor;
