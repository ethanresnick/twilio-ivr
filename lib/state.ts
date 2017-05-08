import { TwimlResponse, CallDataTwiml } from "twilio";
import "./twilioAugments";
import { urlFor } from "./modules/urlFor";

// This is a complete list of state types for the type guard functions below.
export type State = BranchingState | RenderableState | NormalState | RoutableState;

// States that are branching + renderable, but not normal, are invalid because
// the input from the rendered twiml can't be sent anywhere without a processTransitionUri.
export type ValidState = NormalState |
  (BranchingState & { render?: undefined }) |
  (RenderableState & { transitionOut?: undefined });

// Some types we share with consumers for convenience.
export { urlFor };

export interface AbstractState {
  name?: string;
}

export interface RoutableState extends AbstractState {
  uri: string;
}

export interface BranchingState extends AbstractState {
  // Take an immutable session data and some input; return a promise for the
  // modified session data (if being at this state told us something about the
  // call we want to store) and the next state to go to.
  transitionOut(inputData?: CallDataTwiml): Promise<ValidState>|ValidState;
}

export interface RenderableState extends AbstractState {
  twimlFor(urlFor: urlFor, inputData?: CallDataTwiml): TwimlResponse | string;
  backgroundTrigger?(urlFor: urlFor, inputData?: CallDataTwiml): void;
}

export interface NormalState extends BranchingState, RenderableState {
  processTransitionUri: string;
}


/**
 * Tests if a state is a RoutableState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is a RoutableState
 */
export function isRoutableState(it: State): it is RoutableState {
  return it && (<RoutableState>it).uri !== undefined;
}

/**
 * Tests if a state is a BranchingState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is a BranchingState
 */
export function isBranchingState(it: State): it is BranchingState {
  return it && (<BranchingState>it).transitionOut !== undefined;
}

/**
 * Tests if a state is a RenderableState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is a RenderableState
 */
export function isRenderableState(it: State): it is RenderableState {
  return it && (<RenderableState>it).twimlFor !== undefined;
}

/**
 * Tests if a state is a NormalState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is a NormalState
 */
export function isNormalState(it: State): it is NormalState {
  return it && (<NormalState>it).processTransitionUri !== undefined;
}

/**
 * Tests if a state is a valid state
 * @param {State} it A state to test
 * @return {boolean} Whether the state is a valid state
 */
export function isValidState(it: State): it is ValidState {
  return isNormalState(it) || (isBranchingState(it) !== isRenderableState(it));
}

/**
 * Converts a state to a string, attempting to read its name.
 * @return {string} The state's name property or "unnamed state" if none exists.
 */
export function stateToString(it: State): string {
  return (it && it.name) || "unnamed state";
}

export default State;
