import { urlFor, EndState, RoutableState } from "../../lib/state";

export function filesConfig(obj: any) {
  return {
    twilio: { authToken: "", validate: false},
    staticFiles: obj
  };
}

export function stateRenderingUrlFor(urlToRender: string, stateUri: string): EndState & RoutableState {
  return {
    name: "URL_FOR_TEST",
    uri: stateUri,
    isEndState: true,
    twimlFor(urlFor: urlFor, input?: any) {
      return urlFor(urlToRender);
    }
  };
}
