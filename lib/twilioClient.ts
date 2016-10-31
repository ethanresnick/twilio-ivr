import config from "./config";
import twilio = require("twilio");

// Configure twilio client to use the Test credentials during development.
// If you want need to override this (which you shouldn't), you can pass in
// the live credentials in the GC_TWILIO_TEST_AUTH_TOKEN setting from argv.
export default Promise.resolve(
  new twilio.RestClient(
    config.get("twilio:accountId"), config.get("twilio:authToken")
  ));
