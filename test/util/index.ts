import { urlFor, EndState, RoutableState } from "../../lib/state";

/**
 * A small helper for generating a valid config object for the library, with the
 * caller just having to fill in how they want static file handling configured.
 * @param {Object} obj Configuration for static file handling.
 */
export function filesConfig(obj: any) {
  return {
    twilio: { authToken: "", validate: false},
    staticFiles: obj,
    session: { secret: 'fuck' }
  };
}

/**
 * Generate a state that will just render the urlFor a given path.
 * This is useful for testing that the urlFor function passed to states is
 * being generated/is working properly.
 *
 * @param {string} urlToRender The root-relative url whose urlFor whe should render.
 * @param {string} stateUri The uri that this state will respond to, for use in tests.
 */
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
