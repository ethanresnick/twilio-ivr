import debug = require("debug");
import { entries as objectEntries } from "./util/objectValuesEntries";

// create an logger for each log level
const loggers = {
  info: debug("twilio-ivr:info"),
  warn: debug("twilio-ivr:warn"),
  error: debug("twilio-ivr:error")
}

// Bind each logger to the corresponding console method.
// Once https://github.com/Microsoft/TypeScript/pull/12207/
// is merged, we can get rid of the <any> and get type safety.
objectEntries(loggers).forEach(([name, logger]) => {
  logger.log = (<any>console)[name].bind(console);
})

export default loggers;
