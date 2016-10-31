declare module "static-expiry";

declare module "testdouble" {
  // Typescript really offers no good way to type this atm.
  type TestDoubleObject = any;

  interface TestDoubleFunction {
    (): any
  }

  interface ExplainedTestDouble {
    callCount: number;
    calls: {testDouble: TestDoubleFunction, args: any[], context: any}[];
    description: string;
    isTestDouble: boolean;
  }

  interface ConfigureStub {
    thenReturn(...stubbedValues: any[]): TestDoubleFunction;
    thenThrow(...stubbedValues: any[]): TestDoubleFunction;
    thenResolve(...stubbedValues: any[]): TestDoubleFunction;
    thenReject(...stubbedValues: any[]): TestDoubleFunction;
    thenCallback(...stubbedValues: any[]): TestDoubleFunction;
    thenDo(...stubbedValues: any[]): TestDoubleFunction;
  }

  namespace Matchers {
    type MatcherDefinition = {
      name?: string,
      onCreate?: (matcherInstance: any, matcherArgs: any[]) => void,
      matches(matcherArgs: any[], actual: any): boolean
    };

    type Matcher = (...args: any[]) => boolean;

    function anything(): Matcher;
    function create(conf: MatcherDefinition): Matcher
  }

  interface TestDoubleConfig {
    promise?: Function;
    ignoreWarnings?: boolean;
    suppressErrors?: boolean;
  }

  interface WhenAndVerifyConfig {
    ignoreExtraArgs?: boolean;
    times?: number;
  }

  interface ObjectConfig {
    excludeMethods: string[]
  }

  namespace td {
    function config(config: TestDoubleConfig): typeof td;
    const matchers: typeof Matchers;

    function func(name?: string): TestDoubleFunction;

    function object(constructor: Function): TestDoubleObject;
    function object(fnNames: string[]): TestDoubleObject;
    function object(objectName?: string, tdConfig?: ObjectConfig): TestDoubleObject;
    function object(pojo: any): TestDoubleObject;

    function when(tdFnCall: any, config?: WhenAndVerifyConfig): ConfigureStub;
    function verify(tdFnCall: any, config?: WhenAndVerifyConfig): undefined;
    function explain(tdFn: TestDoubleFunction): ExplainedTestDouble;
  }

  export= td;
}
