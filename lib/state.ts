import { CallSessionImmutable } from "./session";
import { TwimlResponse, CallDataTwiml } from "twilio";
import "./twilioAugments";
import { urlFor } from "../util/routeCreationHelpers";

// A RoutableState that's not also either a BranchingState, or a RenderableState
// subtype is invalid, so we don't include RoutableState in the UsableState type.
export type UsableState = BranchingState | EndState | NormalState | AsynchronousState;

// This is a complete list of state types for the type guard functions below.
type State = UsableState | RenderableState | RoutableState;

// Some types we share with consumers for convenience.
export type Session = CallSessionImmutable;
export { urlFor };

interface AbstractState {
  name: string;
}

export interface RoutableState extends AbstractState {
  uri: string;
}

export interface BranchingState extends AbstractState {
  // Take an immutable session data and some input; return a promise for the
  // modified session data (if being at this state told us something about the
  // call we want to store) and the next state to go to.
  transitionOut(callSession: Session, inputData?: CallDataTwiml): Promise<[Session, UsableState]>;
}

export interface RenderableState extends AbstractState {
  twimlFor(callSession: Session, urlFor: urlFor, inputData?: CallDataTwiml): TwimlResponse;
}

export interface EndState extends RenderableState {
  isEndState: true;
}

export interface AsynchronousState extends RenderableState {
  backgroundTrigger(callSession: Session, urlFor: urlFor, inputData?: CallDataTwiml): void;
}

export interface NormalState extends BranchingState, RenderableState {
  processTransitionUri: string;
}




export function isRoutableState(it: State): it is RoutableState {
  return it && (<RoutableState>it).uri !== undefined;
}

export function isBranchingState(it: State): it is BranchingState {
  return it && (<BranchingState>it).transitionOut !== undefined;
}

export function isRenderableState(it: State): it is RenderableState {
  return it && (<RenderableState>it).twimlFor !== undefined;
}

export function isEndState(it: State): it is EndState {
  return it && (<EndState>it).isEndState === true;
}

export function isAsynchronousState(it: State): it is AsynchronousState {
  return it && (<AsynchronousState>it).backgroundTrigger !== undefined;
}

export function isNormalState(it: State): it is NormalState {
  return it && (<NormalState>it).processTransitionUri !== undefined;
}


export function isUsableState(it: State): it is UsableState {
  return isBranchingState(it) || isEndState(it) || isNormalState(it) || isAsynchronousState(it);
}


export default State;
