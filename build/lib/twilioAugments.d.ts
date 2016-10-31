declare module "twilio" {
    type CallDirection = "inbound" | "outbound-api" | "outbound-dial" | "trunking-terminating" | "trunking-originating";
    type CallStatus = "queued" | "ringing" | "in-progress" | "busy" | "failed" | "canceled" | "no-answer" | "completed";
    interface CallDataTwiml {
        CallSid: string;
        Direction: CallDirection;
        CallStatus: CallStatus;
        AccountSid: string;
        ForwardedFrom?: string;
        CallerName?: string;
        To: string;
        ToCountry?: string;
        ToState?: string;
        ToCity?: string;
        ToZip?: string;
        From: string;
        FromCountry?: string;
        FromState?: string;
        FromCity?: string;
        FromZip?: string;
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
    function isCallDataTwiml(it: any): it is CallDataTwiml;
    interface GatherDataTwiml extends CallDataTwiml {
        msg: "Gather End";
        Digits: string;
    }
    interface CallDataAPI {
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
        sid: string;
        direction: CallDirection;
        status: CallStatus;
        accountSid: string;
        to: string;
        from: string;
        apiVersion: string;
    }
    interface ConferenceDataAPI {
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
export {};
