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

	var senecaUserLoginMockResponse = {
		user: {
			name: 'Testy McTest',
			id  : 999
		}
	};

	var senecaMock = {
		addAsync: sinon.stub(),
		actAsync: sinon.stub().returns(Promise.resolve(senecaUserLoginMockResponse))
	};

	var passportAuthFuncStub = sinon.stub().returns(Promise.resolve({
		result: 'success'
	}));

	var passportMock = {
		framework   : sinon.stub(),
		authenticate: sinon.stub().returns(passportAuthFuncStub)
	};

	var jwtMock = {
		sign: sinon.stub().returns('MOCKJWT')
	};

    describe('strategy loader', function () {

        it('should load all strategies in the strategy directory', function () {

	        var config = {
		        auth: {
			        autoLogin: false,
			        expiry: 1,
			        strategyFolder: './test/two_strategies',
			        common: {
				        base:    'common',
				        extend: 'common'
			        },
			        strategy_1: {
				        extend: 'strategy_1'
			        },
			        strategy_2: {
				        extend: 'strategy_2'
			        }
		        }
	        };

	        var strategy1Mock = sinon.stub();
	        var strategy2Mock = sinon.stub();

	        proxyquire.noCallThru()('../index', {
		        passport: passportMock,
		        jsonwebtoken: jwtMock,
		        './test/two_strategies/strategy_1.js': strategy1Mock,
		        './test/two_strategies/strategy_2.js': strategy2Mock
	        })(config, senecaMock);

	        expect(strategy1Mock.args[0][1].base).to.equal('common');
	        expect(strategy1Mock.args[0][1].extend).to.equal('strategy_1');
	        expect(strategy2Mock.args[0][1].base).to.equal('common');
	        expect(strategy2Mock.args[0][1].extend).to.equal('strategy_2');
        });
    });

    describe('seneca message handler: auth', function () {

        var config = {
            auth: { autoLogin: false, expiry: 1, strategyFolder: './test/no_strategies' }
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
	        passportAuthFuncStub.reset();
	        action({ strategy: 'test',
                session: { request_token: 'rt', 'oauth_token_secret': 'ots', 'should_not_be_here': 'test'}
            });

            expect(passportAuthFuncStub).to.have.been.calledWithMatch({ session: {
                'oauth:test': {
	                request_token       : 'rt',
	                'oauth_token_secret': 'ots'
                }
            } });
            expect(passportAuthFuncStub).to.not.have.been.calledWithMatch({ 'should_not_be_here': 'test' });
        });

        it('should pass to passport only the required query args', function () {
	        passportAuthFuncStub.reset();
	        action({
                strategy: 'test',
                'oauth_token': 'ot',
                'oauth_verifier': 'ov',
                'code': 'c',
                'client_id': 'cid',
                'should_not_be_here2': 'test2'
            });

            expect(passportAuthFuncStub).to.have.been.calledWithMatch({ query: {
                'oauth_token': 'ot',
                'oauth_verifier': 'ov',
                'code': 'c',
                'client_id': 'cid'
            } });
            expect(passportAuthFuncStub).to.not.have.been.calledWithMatch({ 'should_not_be_here2': 'test' });
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
                    }).then(done).catch(done);
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
                    }).then(done).catch(done);
                });

                it('should return the response user, success:true and result:success', function (done) {
                    expect(result).to.be.fulfilled.then(function(res) {
                        expect(res.success).to.equal(true);
                        expect(res.result).to.equal('success');
                        expect(res.user.name).to.equal('Testy McTest');
                    }).then(done).catch(done);
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
