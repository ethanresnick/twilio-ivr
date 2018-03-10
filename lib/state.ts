import { Request } from "express";
import { CallDataTwiml } from "twilio";
import "./twilioAugments";
import { urlFor } from "./util/routeCreationHelpers";

// A RoutableState that's not also either a BranchingState, or a RenderableState
// subtype is invalid, so we don't include RoutableState in the UsableState type.
export type UsableState = BranchingState | EndState | NormalState | AsynchronousState;

// This is a complete list of state types for the type guard functions below.
export type State = UsableState | RenderableState | RoutableState;

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
  transitionOut(req: Request, inputData?: CallDataTwiml): Promise<UsableState>|UsableState;
}

export interface RenderableState extends AbstractState {
  twimlFor(urlFor: urlFor, req: Request, inputData?: CallDataTwiml): string;
}

export interface EndState extends RenderableState {
  isEndState: true;
}

export interface AsynchronousState extends RenderableState {
  backgroundTrigger(urlFor: urlFor, req: Request, inputData?: CallDataTwiml): void;
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
 * Tests if a state is an EndState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is an EndState
 */
export function isEndState(it: State): it is EndState {
  return it && (<EndState>it).isEndState === true;
}

/**
 * Tests if a state is an AsynchronousState
 * @param {State} it A state to test
 * @return {boolean} Whether the state is an AsynchronousState
 */
export function isAsynchronousState(it: State): it is AsynchronousState {
  const state = <AsynchronousState>it;

  return state && state.twimlFor !== undefined && state.backgroundTrigger !== undefined;
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
 * Whether the state is not only a UsableState, but a "valid" one.
 * This rejects some states that typescript doesn't let us rule out statically,
 * but that are nevertheless invalid, namely: branching + renderable but
 * non-normal ones.
 *
 * @param  {State} it
 * @return {boolean} Whether the state is a valid state.
 */
export function isValidState(it: State): boolean {
  return isNormalState(it) || isAsynchronousState(it) || isEndState(it)
    || (isBranchingState(it) && !isRenderableState(it));
}

/**
 * Converts a state to a string, attempting to read its name.
 * @return {string} The state's name property or "unnamed state" if none exists.
 */
export function stateToString(it: State): string {
  return (it && it.name) || "unnamed state";
}

export default State;
