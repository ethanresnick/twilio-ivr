import * as State from "../../lib/state";
import { TwimlResponse } from "twilio";

const emptyTwimlFn = () => new TwimlResponse();

export const d = <any>{
  name: "d",
  twimlFor: emptyTwimlFn
};

export const e = <any>{
  name: "e",
  uri: "/go"
};

// An invalid state because it's branching and renderable without being normal!
export const j = <State.UsableState>{
  name: "f",
  twimlFor: emptyTwimlFn,
  transitionOut: (it: any) => Promise.resolve([it, i])
};

export const h = <State.AsynchronousState>{
  name: "h",
  twimlFor: emptyTwimlFn,
  backgroundTrigger: emptyTwimlFn
};

export const routableStates = [e];
export const invalidStates = [d, e, j];



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

export const branchingStates = [f, i, j];



export const g = <State.EndState>{
  name: "g",
  isEndState: true,
  twimlFor: emptyTwimlFn
};

export const endStates = [g];
export const normalStates = [i];
export const asynchronousStates = [h];
export const renderableStates = [d, g, i, h, j];


export const allStates = (<any[]>invalidStates).concat(branchingStates, renderableStates);
