"use strict";
const request = require("supertest");
const _1 = require("../../lib/");
describe("error handling (at component integration points)", () => {
    describe("an invalid state transition (to undefined, an error, or an invalid state)", () => {
        it("should trigger the express app's error handling middleware", () => {
            let statesWithInvalidTransition = [
                { uri: "/1",
                    transitionOut() {
                        return undefined;
                    }
                },
                {
                    uri: "/2",
                    transitionOut() {
                        return { uri: "/" };
                    }
                },
                {
                    uri: "/3",
                    transitionOut() {
                        return Promise.reject(new Error("Couldn't find next state."));
                    }
                }
            ];
            let app = _1.default(statesWithInvalidTransition, { twilio: { authToken: "", validate: false } });
            app.use(function (err, req, res, next) {
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
