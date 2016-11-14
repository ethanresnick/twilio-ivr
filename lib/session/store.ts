import logger from "../logger";
import { CallSession, CallSid } from "./index";
import { EventEmitter } from "events";

export interface SessionStore<T extends CallSession> extends EventEmitter {
  get(key: CallSid): Promise<T | undefined>;
  set(callSid: CallSid, value: T): Promise<"created" | "updated">;
  destroy(key: CallSid): Promise<boolean>;
  touch?(key: CallSid): Promise<boolean>;
};
