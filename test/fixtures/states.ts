import * as State from "../../lib/state";
import { TwimlResponse } from "twilio";

const emptyTwimlFn = () => new TwimlResponse();

export const e = <State.RoutableState>{
  name: "e",
  uri: "/go"
};

// An invalid state because it's
// branching and renderable without being normal!
export const j = <State.BranchingState & State.RenderableState>{
  name: "j",
  twimlFor: emptyTwimlFn,
  transitionOut: (it: any) => Promise.resolve(i)
};

export const d = <State.RenderableState>{
  name: "d",
  twimlFor: emptyTwimlFn
};

export const h = <State.RenderableState>{
  name: "h",
  twimlFor: emptyTwimlFn,
  backgroundTrigger: emptyTwimlFn
};

export const f = <State.BranchingState>{
  name: "f",
  transitionOut: (it: any) => Promise.resolve(i)
};

export const i = <State.NormalState>{
  name: "i",
  twimlFor: emptyTwimlFn,
  processTransitionUri: "/t",
  transitionOut: (it: any) => Promise.resolve(h),
};

export const routableStates = [e];
export const invalidStates = [e, j];
export const renderableStates = [j, d, h, i];
export const branchingStates = [f, i, j];
export const normalStates = [i];

export const allStates = (<any[]>invalidStates).concat(branchingStates, renderableStates);
