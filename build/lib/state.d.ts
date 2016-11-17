/// <reference types="twilio" />
import { TwimlResponse, CallDataTwiml } from "twilio";
import "./twilioAugments";
import { urlFor } from "./util/routeCreationHelpers";
export declare type UsableState = BranchingState | EndState | NormalState | AsynchronousState;
export declare type State = UsableState | RenderableState | RoutableState;
export { urlFor };
export interface AbstractState {
    name: string;
}
export interface RoutableState extends AbstractState {
    uri: string;
}
export interface BranchingState extends AbstractState {
    transitionOut(inputData?: CallDataTwiml): Promise<UsableState> | UsableState;
}
export interface RenderableState extends AbstractState {
    twimlFor(urlFor: urlFor, inputData?: CallDataTwiml): TwimlResponse | string;
}
export interface EndState extends RenderableState {
    isEndState: true;
}
export interface AsynchronousState extends RenderableState {
    backgroundTrigger(urlFor: urlFor, inputData?: CallDataTwiml): void;
}
export interface NormalState extends BranchingState, RenderableState {
    processTransitionUri: string;
}
export declare function isRoutableState(it: State): it is RoutableState;
export declare function isBranchingState(it: State): it is BranchingState;
export declare function isRenderableState(it: State): it is RenderableState;
export declare function isEndState(it: State): it is EndState;
export declare function isAsynchronousState(it: State): it is AsynchronousState;
export declare function isNormalState(it: State): it is NormalState;
export declare function isValidState(it: State): boolean;
export default State;
