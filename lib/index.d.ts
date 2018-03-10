/// <reference types="express" />
import { Express, Handler, RequestHandler, Request as ExpressRequest } from "express";
export default function (states: UsableState[], config: config): Express;

export interface Request extends ExpressRequest {
  session?: any;
}

export type config = {
  twilio: {
    authToken: string;
    validate?: boolean;
  };
  staticFiles?: (
    { path: string; middleware?: Handler; fingerprintUrl: undefined; } |
    { path: undefined; middleware: Handler; fingerprintUrl: fingerprintUrl; }
  ) & {
    mountPath?: string;
    holdMusic?: {
      fileRelativeUri: string;
      endpoint?: string;
      twimlFor?: (urlFor: urlFor) => string;
    };
  };
  session?: RequestHandler;
  trustProxy?: boolean;
};

export type fingerprintUrl = (path: string) => string;
export type urlFor = (path: string, options?: UrlForOptions) => string;
export type UrlForOptions = {
  query?: any;
  fingerprint?: boolean;
  absolute?: boolean;
};

export type UsableState = BranchingState | EndState | NormalState | AsynchronousState;
export type State = UsableState | RenderableState | RoutableState;

export interface AbstractState {
  name?: string;
}

export interface RoutableState extends AbstractState {
  uri: string;
}

export interface BranchingState extends AbstractState {
  transitionOut(req: Request, inputData?: any): Promise<UsableState> | UsableState;
}

export interface RenderableState extends AbstractState {
  twimlFor(urlFor: urlFor, req: Request, inputData?: any): string;
}

export interface EndState extends RenderableState {
  isEndState: true;
}

export interface AsynchronousState extends RenderableState {
  backgroundTrigger(urlFor: urlFor, req: Request, inputData?: any): void;
}

export interface NormalState extends BranchingState, RenderableState {
  processTransitionUri: string;
}
