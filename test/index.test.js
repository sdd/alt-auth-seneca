"use strict";
var proxyquire      = require('proxyquire'),
    Promise         = require('bluebird'),
    chai            = require('chai'),
    sinon           = require('sinon'),
    expect          = chai.expect;

chai.use(require('sinon-chai'));
chai.use(require("chai-as-promised"));

var senecaAuth = require('../index');

describe('alt-seneca-auth', function() {

    describe('strategy loader', function () {

        it('should load all strategies in the strategy directory', function () {

        });
    });

    describe('seneca message handler: auth-auth', function () {

        var senecaUserLoginMockResponse = {
            user: {
                name: 'Testy McTest',
                id: 999
            }
        };

        var senecaMock = {
            addAsync: sinon.stub(),
            actAsync: sinon.stub().returns(Promise.resolve(senecaUserLoginMockResponse))
        };

        var passportAuthFuncStub = sinon.stub().returns(Promise.resolve({}));
        
        var passportMock = {
            framework: sinon.stub(),
            authenticate: sinon.stub().returns(passportAuthFuncStub)
        };

        var jwtMock = {
            sign: sinon.stub().returns('MOCKJWT')
        };

        var config = {
            auth: { autoLogin: false, expiry: 1, strategyFolder: './no_strategies' }
        };

        proxyquire('../index', { passport: passportMock, jsonwebtoken: jwtMock })(config, senecaMock);

        var action = senecaMock.addAsync.args[0][1];

        it('should register with seneca using the correct matcher', function () {
            expect(senecaMock.addAsync.args[0][0].system).to.equal('auth');
            expect(senecaMock.addAsync.args[0][0].action).to.equal('auth');
        });

        it('should call passport auth with the correct strategy', function () {
            action({ strategy: 'test' });
            expect(passportMock.authenticate).to.have.been.calledWith('test');
        });

        it('should pass to passport only the required args from session', function () {
            action({ strategy: 'test',
                session: { request_token: 'rt', 'oauth_token_secret': 'ots', 'should_not_be_here': 'test'}
            });


        });

        it('should pass to passport only the required query args', function () {
            action({ strategy: 'test',
                query: { 'oauth_token': 'ot', 'oauth_verifier': 'ov', 'code': 'c', 'client_id': 'cid', 'should_not_be_here2': 'test2' }
            });


        });

        describe('given a redirect response', function () {

            var result;

            beforeEach(function() {
                passportAuthFuncStub.returns(Promise.resolve({
                    result: 'redirect',
                    testResponse1: 'testResponse1'
                }));

                result = action({ strategy: 'test' });
            });

            it('should set the oauth_token_secret', function () {
                expect(passportMock.authenticate).to.have.been.calledWith('test');
            });

            it('should return the response', function (done) {
                expect(result).to.eventually.have.property('testResponse1').notify(done);
            });
        });

        describe('given a success response', function () {

            describe('with config.autoLogin false', function () {

                var result;

                beforeEach(function() {
                    config.auth.autoLogin = false;

                    passportAuthFuncStub.returns(Promise.resolve({
                        result: 'success',
                        testResult2: 'testResult2'
                    }));

                    result = action({ strategy: 'test' });
                });

                it('should return success:true and result:success', function (done) {
                    expect(result).to.be.fulfilled.then(function(res) {
                        expect(res.success).to.equal(true);
                        expect(res.result).to.equal('success');
                        expect(res.auth.testResult2).to.equal('testResult2');
                    }).then(done);
                });
            });

            describe('with config.autoLogin true', function () {

                var result;

                beforeEach(function() {
                    config.auth.autoLogin = true;

                    result = action({ strategy: 'test' });
                });

                it('should return a valid jwt', function (done) {
                    expect(result).to.be.fulfilled.then(function(res) {
                        expect(jwtMock.sign).to.have.been.called;
                        expect(res.jwt).to.equal('MOCKJWT');
                    }).then(done);
                });

                it('should return the response user, success:true and result:success', function (done) {
                    expect(result).to.be.fulfilled.then(function(res) {
                        expect(res.success).to.equal(true);
                        expect(res.result).to.equal('success');
                        expect(res.user.name).to.equal('Testy McTest');
                    }).then(done);
                });
            });
        });

        describe('given a unknown response', function () {

            it('should reject', function (done) {
                passportAuthFuncStub.returns(Promise.resolve({
                    result: 'wtf',
                    testResponse5: 'testResponse5'
                }));

                var result = action({ strategy: 'test' });

                expect(result).to.be.rejected.notify(done);
            });
        });
    });
});
