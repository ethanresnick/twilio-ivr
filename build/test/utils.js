"use strict";
const td = require("testdouble");
const Immutable = require("immutable");
exports.isImmutableEquals = td.matchers.create({
    name: 'isImmutableEquals',
    matches: function (matcherArgs, actual) {
        return Immutable.is(matcherArgs[0], actual);
    }
});
