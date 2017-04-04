/// <reference types="express" />
/// <reference types="twilio" />
import { Express, Handler } from "express";
import { TwimlResponse } from "twilio";

export default function (states: UsableState[], config: config): Express;

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
      twimlFor?: (urlFor: urlFor) => TwimlResponse | string;
    };
  };
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
  transitionOut(inputData?: CallDataTwiml, query?: any): Promise<UsableState> | UsableState;
}

export interface RenderableState extends AbstractState {
  twimlFor(urlFor: urlFor, inputData?: CallDataTwiml, query?: any): TwimlResponse | string;
}

export interface EndState extends RenderableState {
  isEndState: true;
}

export interface AsynchronousState extends RenderableState {
  backgroundTrigger(urlFor: urlFor, inputData?: CallDataTwiml, query?: any): void;
}

export interface NormalState extends BranchingState, RenderableState {
  processTransitionUri: string;
}

type CallDirection = "inbound" | "outbound-api" | "outbound-dial" | "trunking-terminating" | "trunking-originating";
type CallStatus = "queued" | "ringing" | "in-progress" | "busy" | "failed" | "canceled" | "no-answer" | "completed";

export interface CallDataTwiml {
  CallSid: string;
  Direction: CallDirection;
  CallStatus: CallStatus;
  AccountSid: string;
  ForwardedFrom?: string;
  CallerName?: string;
  To: string;
  ToCountry?: string;
  ToState?: string;
  ToCity?: string;
  ToZip?: string;
  From: string;
  FromCountry?: string;
  FromState?: string;
  FromCity?: string;
  FromZip?: string;
  Called: string;
  CalledCountry: string;
  CalledState: string;
  CalledCity: string;
  CalledZip: string;
  Caller: string;
  CallerCountry: string;
  CallerState: string;
  CallerCity: string;
  CallerZip: string;
  ApiVersion: '2010-04-01';
}

export interface GatherDataTwiml extends CallDataTwiml {
  msg: "Gather End";
  Digits: string;
}

export interface CallDataAPI {
  dateCreated: string | null;
  dateUpdated: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  parentCallSid: string | null;
  toFormatted: string;
  fromFormatted: string;
  price: string | null;
  priceUnit: string;
  phoneNumberSid: string;
  answeredBy: string | null;
  forwardedFrom: string | null;
  groupSid: string | null;
  callerName: string | null;
  uri: string;
  sid: string;
  direction: CallDirection;
  status: CallStatus;
  accountSid: string;
  to: string;
  from: string;
  apiVersion: string;
}
