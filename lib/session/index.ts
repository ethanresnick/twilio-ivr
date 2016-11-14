export type CallSid = string;

export interface CallSession {
  callSid: CallSid;
}

export { default as middleware } from "./middleware";
export { default as Store } from "./store";
