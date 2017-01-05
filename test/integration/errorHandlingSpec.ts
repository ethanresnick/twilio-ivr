import request = require("supertest");
import lib from "../../lib/";
import { ErrorRequestHandler } from "express";
import { BranchingState, RoutableState } from "../../lib/state";

describe("error handling (at component integration points)", () => {
  describe("an invalid state transition (to undefined, an error, or an invalid state)", () => {
    it("should trigger the express app's error handling middleware", () => {
      let statesWithInvalidTransition = <(BranchingState & RoutableState)[]>[
        { uri: "/1",
          transitionOut() {
          return undefined;
          }
        },
        {
          uri: "/2",
          transitionOut() {
            return {uri: "/"}; // resulting state must be usable.
          }
        },
        {
          uri: "/3",
          transitionOut() {
            return Promise.reject(new Error("Couldn't find next state."));
          }
        }
      ];

      let app = lib(statesWithInvalidTransition, {twilio: { authToken: "", validate: false}});
      app.use(<ErrorRequestHandler>function(err, req, res, next) {
        res.status(500).send('error handler reached');
      });

      return Promise.all([
        request(app).post('/1').expect(500, 'error handler reached'),
        request(app).post('/2').expect(500, 'error handler reached'),
        request(app).post('/3').expect(500, 'error handler reached')
      ]);
    });
  });
});
