export function filesConfig(obj: any) {
  return {
    twilio: { authToken: "", validate: false},
    staticFiles: obj
  };
}
