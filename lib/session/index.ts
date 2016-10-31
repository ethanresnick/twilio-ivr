import * as Immutable from "immutable";

export interface CallSession {
  callSid: string;
}

export type CallSessionImmutable = Immutable.Map<string, any>;

export { default as middleware } from "./middleware";
export { default as Store } from "./store";
