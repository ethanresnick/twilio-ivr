import * as Sequelize from "sequelize";
import { CallSid, Call, CallInstance } from "../../models/call";
import { CallSession } from "./index";
export interface SessionStore {
    get(key: CallSid): Promise<CallSession | undefined>;
    set(callSid: CallSid, value: CallSession): Promise<"created" | "updated">;
    destroy(key: CallSid): Promise<boolean>;
}
export default class SequelizeStore implements SessionStore {
    private callModel;
    constructor(callModel: Sequelize.Model<CallInstance, Call>);
    get(callSid: CallSid): any;
    set(callSid: CallSid, value: CallSession): any;
    destroy(callSid: CallSid): any;
}
