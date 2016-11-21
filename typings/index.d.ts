declare module "static-expiry";

declare module "stream-equal" {
  type Cb = (err: Error | null, equal: boolean) => void;

  function streamEqual(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadableStream, cb: Cb): undefined;
  function streamEqual(stream1: NodeJS.ReadableStream, stream2: NodeJS.ReadableStream): Promise<boolean>;
  export= streamEqual;
}
