"use strict";
var   proxyquire      = require('proxyquire'),
        chai            = require("chai"),
        sinon           = require("sinon"),
        expect          = chai.expect;

chai.use(require("sinon-chai"));

var routerStub = {},
    routerStubWrapper = () => routerStub,
    senecaStub = {};

var senecaAuthKoa = proxyquire('../seneca-auth-koa', { 'koa-router': routerStubWrapper });

describe('seneca-auth-koa', function() {

    beforeEach(function() {

    });

    describe('strategy parameter', function() {

        var paramGenFunc = null;
        var routerGetMap = {};
        var mw = null;
        routerStub.param = function(name, func) { paramGenFunc = func; };
        routerStub.get = function(url, func) { routerGetMap[url] = func; };
        routerStub.middleware = function(){};

        beforeEach(function() {
            paramGenFunc = null;
            mw = senecaAuthKoa(senecaStub);
        });

        it('should set strategy to the strategy argument', function() {
            var ctx = {};

            paramGenFunc.call(ctx, 'onion', function(){});

            expect(ctx.strategy).to.equal('onion');
            expect(ctx.status).to.equal(undefined);

        });

        it('should set strategy to the strategy argument', function() {
            var ctx = {};

            paramGenFunc.call(ctx, undefined, function(){});

            expect(ctx.strategy).to.equal(undefined);
            expect(ctx.status).to.equal(404);

        });


    });

    describe('auth generator', function() {

    });

    describe('auth callback generator', function() {

    });
});
