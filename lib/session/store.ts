import * as Sequelize from "sequelize";
import { CallSid, Call, CallInstance } from "../../models/call";
import { CallSession } from "./index";

export interface SessionStore {
  get(key: CallSid): Promise<CallSession|undefined>;
  set(callSid: CallSid, value: CallSession): Promise<"created" | "updated">;
  destroy(key: CallSid): Promise<boolean>;
};


// Our abstraction around the db.
// The interface here is inspired by express-session, though our store isn't
// an event emitter (in part because sequelize doesn't give us events when
// the connection pool all goes down).
// See https://github.com/sequelize/sequelize/issues/2113
export default class SequelizeStore implements SessionStore {
  constructor(private callModel: Sequelize.Model<CallInstance, Call>) {}

  get(callSid: CallSid) {
    // Include any linked user calls in our result.
    const callQuery = {
      where: {callSid: callSid},
      include: [{model: this.callModel, as: "userCall"}]
    };

    return this.callModel.findOne(callQuery).then(call => {
      return call ? call.get({plain: true}) : undefined;
    });
  }

  set(callSid: CallSid, value: CallSession) {
    return this.callModel.upsert(value)
      .then((created: boolean) => created ? "created" : "updated");
  }

  destroy(callSid: CallSid) {
    return this.callModel
      .destroy({ where: {callSid: callSid } })
      .then(deletedCount => deletedCount > 0);
  }
}
