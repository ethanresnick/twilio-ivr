import * as chai from "chai";
import td = require("testdouble");
import http = require("http");
import { Request, Response, NextFunction, RequestHandler } from "express";
//import session from "../../../../lib/session/middleware";
//import SequelizeStore from "../../../../lib/session/store";

const expect = chai.expect;

describe("the session middleware", () => {
  describe("the factory/wrapper function", () => {
    it("should require a store be provided", () => {
      //expect(session).to.throw(/store/);
    })

    it("should return an express middleware", () => {
      //const storeMock = td.object(SequelizeStore);
      //expect(session({store: storeMock})).to.be.a('function').with.length(3);
    });
  });

  describe(",", () => {
    it("should persist changes in joined user calls", () => {
      expect(true).to.be.false; // make sure this works
    });
  });
})

// expect it to exercise the store with valid data;
// don't test that the store does anything.
//
// in the integration test for the store, don't look at what sequelize methods
// it calls (in fact, ignore that sequelize is being used), as that's too tight
// a coupling to how exactly we're making the query. instead, observe the state
// in the db.
/*
function createServer(opts: any, fn: RequestHandler) {
  return http.createServer(createRequestListener(opts, fn))
}

function createRequestListener(opts: any, respond: RequestHandler) {
  var _session = createSession(opts);

  return function onRequest(req: Request, res: Response) {
    var server = this

    _session(req, res, function (err: any) {
      if (err && !(<any>res)._header) {
        res.statusCode = err.status || 500
        res.end(err.message)
        return
      }

      if (err) {
        server.emit('error', err)
        return
      }

      respond ? respond(req, res, () => undefined) : res.end();
    })
  }
}

function createSession(opts: any = {}) {
  return session(opts);
}
*/
