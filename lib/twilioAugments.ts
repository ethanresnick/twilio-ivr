import twilio = require("twilio");

declare module "twilio" {
  type CallDirection =
    "inbound" | "outbound-api" | "outbound-dial" | "trunking-terminating" | "trunking-originating";

  type CallStatus =
    "queued" | "ringing" | "in-progress" | "busy" | "failed" | "canceled" | "no-answer" | "completed";

  // Documented at https://www.twilio.com/docs/api/twiml/twilio_request#synchronous
  export interface CallDataTwiml {
    CallSid: string;
    Direction: CallDirection;
    CallStatus: CallStatus;
    AccountSid: string;
    ForwardedFrom?: string;
    CallerName?: string;

    // "To" is the phone number, SIP address or Client identifier
    // that received this call.
    To: string;
    ToCountry?: string;
    ToState?: string;
    ToCity?: string;
    ToZip?: string;

    // The opposite of To.
    From: string;
    FromCountry?: string;
    FromState?: string;
    FromCity?: string;
    FromZip?: string;

    // Called and Caller appear to be aliases for To and From respectively.
    Called: string;
    CalledCountry: string;
    CalledState: string;
    CalledCity: string;
    CalledZip: string;
    Caller: string;
    CallerCountry: string;
    CallerState: string;
    CallerCity: string;
    CallerZip: string;

    ApiVersion: '2010-04-01';
  }

  /**
   * Tests wheter a value matches the CallDataTwiml type. Normally, we should know
   * whether twilio's going to give us that type back, so this is just defensive.
   *
   * @param  {any} it A value (usually a parsed request body) to test
   * @return {boolean} Whether the object matches CallDataTwiml
   */
  export function isCallDataTwiml(it: any): it is CallDataTwiml;

  export interface GatherDataTwiml extends CallDataTwiml {
    msg: "Gather End";
    Digits: string;
  }

  export interface CallDataAPI {
    // This has some of the same fields that come in a twiml response
    // (but not all), and the capitalization of the shared fields is different.
    // It also has some extra fields.

    // Properties *NOT* on CallDataTwiml
    dateCreated: string | null;
    dateUpdated: string | null;

    startTime: string | null;
    endTime: string | null;
    duration: string | null;

    parentCallSid: string | null;

    toFormatted: string;
    fromFormatted: string;

    price: string | null;
    priceUnit: string;

    phoneNumberSid: string;
    answeredBy: string | null;
    forwardedFrom: string | null;
    groupSid: string | null;
    callerName: string | null;

    uri: string;

    // Other Properties
    sid: string;
    direction: CallDirection;
    status: CallStatus;
    accountSid: string;

    to: string;

    from: string;

    apiVersion: string;
  }

  export interface ConferenceDataAPI {
    sid: string;
    friendlyName: string;
    accountSid: string;
    dateCreated: string;
    apiVersion: string;
    dateUpdated: string;
    region: string;
    uri: string;
    subresourceUris: {
      participants: string;
    };
  }
}

// See comment attached to type definition above.
twilio.isCallDataTwiml = function(it: any): it is twilio.CallDataTwiml {
  return it && it.CallSid !== undefined;
}
