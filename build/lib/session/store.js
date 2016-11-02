"use strict";
;
class SequelizeStore {
    constructor(callModel) {
        this.callModel = callModel;
    }
    get(callSid) {
        const callQuery = {
            where: { callSid: callSid },
            include: [{ model: this.callModel, as: "userCall" }]
        };
        logger.debug(`Looking up session for call sid ${callSid}`);
        return this.callModel.findOne(callQuery).then(call => {
            return call ? call.get({ plain: true }) : undefined;
        });
    }
    set(callSid, value) {
        logger.debug(`Saving session for call sid ${callSid}`, value);
        return this.callModel.upsert(value)
            .then((created) => created ? "created" : "updated");
    }
    destroy(callSid) {
        return this.callModel
            .destroy({ where: { callSid: callSid } })
            .then(deletedCount => deletedCount > 0);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SequelizeStore;
