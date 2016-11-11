import * as State from "../../lib/state";
import { TwimlResponse } from "twilio";

const emptyTwimlFn = () => new TwimlResponse();

export const d = <any>{
  name: "d",
  staticTwimlFor: true
};

export const e = <any>{
  name: "e",
  uri: "/go"
};

export const h = <State.AsynchronousState>{
  name: "h",
  twimlFor: emptyTwimlFn,
  staticTwimlFor: true,
  backgroundTrigger: emptyTwimlFn
};

export const routableStates = [e];
export const nonUsableStates = [d, e];



export const f = <State.BranchingState>{
  name: "f",
  transitionOut: (it: any) => Promise.resolve([it, i])
};

export const i = <State.NormalState>{
  name: "i",
  twimlFor: emptyTwimlFn,
  processTransitionUri: "/t",
  transitionOut: (it: any) => Promise.resolve([it, h]),
};

export const branchingStates = [f, i];



export const g = <State.EndState>{
  name: "g",
  isEndState: true,
  twimlFor: emptyTwimlFn
};

export const endStates = [g];
export const normalStates = [i];
export const asynchronousStates = [h];
export const renderableStates = [g, i, h];

export const allStates = (<any[]>nonUsableStates).concat(branchingStates, renderableStates);
