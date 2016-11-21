/// <reference types="express" />
/// <reference types="twilio" />
import * as express from "express";
import { CallDataTwiml, TwimlResponse } from "twilio";
import "../twilioAugments";
import { RenderableState, UsableState } from "../state";
export declare function resolveBranches(state: UsableState, inputData?: CallDataTwiml): Promise<RenderableState>;
export declare function renderState(state: UsableState, req: express.Request, staticFilesMountPath: string, furl: furl, inputData: CallDataTwiml | undefined): Promise<string | TwimlResponse>;
export declare type furl = (it: string) => string;
export declare type urlFor = (path: string, options?: UrlForOptions) => string;
export declare type UrlForOptions = {
    query?: any;
    fingerprint?: boolean;
    absolute?: boolean;
};
export declare function urlFor(protocol: string, host: string, mountPath: string, furl: furl): urlFor;
