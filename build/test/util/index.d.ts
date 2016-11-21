import { EndState, RoutableState } from "../../lib/state";
export declare function filesConfig(obj: any): {
    twilio: {
        authToken: string;
        validate: boolean;
    };
    staticFiles: any;
};
export declare function stateRenderingUrlFor(urlToRender: string, stateUri: string): EndState & RoutableState;
