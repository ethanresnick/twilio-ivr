import td = require("testdouble");
import * as Immutable from "immutable";

export const isImmutableEquals = td.matchers.create({
  name: 'isImmutableEquals',
  matches: function(matcherArgs, actual) {
    return Immutable.is(matcherArgs[0], actual);
  }
});
