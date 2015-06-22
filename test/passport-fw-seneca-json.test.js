"use strict";
var proxyquire = require('proxyquire'),
    Promise    = require('bluebird'),
    chai       = require('chai'),
    sinon      = require('sinon'),
    expect     = chai.expect;

chai.use(require('sinon-chai'));
chai.use(require("chai-as-promised"));

var passportFWSenecaJSON = require('../passport-fw-seneca-json');

describe('passport-fw-seneca-json', function() {

	var passportMock = {
		_strategy: sinon.stub()
	};
	var name = 'test';
	var options = {};

	describe('passport error', function() {

		it('should reject on passport error', function(done) {

			var strategyMock = {
				authenticate: function() {
					this.error();
				}
			};
			passportMock._strategy.returns(strategyMock);

			var result = passportFWSenecaJSON.authenticate(passportMock, name, options)({});

			expect(result).to.be.rejected.notify(done);
		});
	});

	describe('passport redirect', function() {

		it('should resolve on passport error', function(done) {

			var strategyMock = {
				authenticate: function() {
					this.redirect('URL1', 'STATUS1');
				}
			};
			passportMock._strategy.returns(strategyMock);

			var result = passportFWSenecaJSON.authenticate(passportMock, name, options)({});

			expect(result).to.be.fulfilled.then(function(res) {
				expect(res.success).to.equal(true);
				expect(res.result).to.equal('redirect');
				expect(res.url).to.equal('URL1');
				expect(res.status).to.equal('STATUS1');
			})
			.then(done)
			.catch(function() {
				expect('Error').to.equal(false);
				done();
			});
		});
	});

	describe('passport success', function() {

		it('should resolve on passport error', function(done) {

			var strategyMock = {
				authenticate: function() {
					this.success('USER1', 'INFO1');
				}
			};
			passportMock._strategy.returns(strategyMock);

			var result = passportFWSenecaJSON.authenticate(passportMock, name, options)({});

			expect(result).to.be.fulfilled.then(function(res) {
				expect(res.success).to.equal(true);
				expect(res.result).to.equal('success');
				expect(res.user).to.equal('USER1');
				expect(res.info).to.equal('INFO1');
			})
				.then(done)
				.catch(function() {
					expect('Error').to.equal(false);
					done();
				});
		});
	});

	describe('passport fail', function() {

		it('should resolve on passport error', function(done) {

			var strategyMock = {
				authenticate: function() {
					this.fail('CHALLENGE1', 'STATUS2');
				}
			};
			passportMock._strategy.returns(strategyMock);

			var result = passportFWSenecaJSON.authenticate(passportMock, name, options)({});

			expect(result).to.be.fulfilled.then(function(res) {
				expect(res.success).to.equal(false);
				expect(res.result).to.equal('failure');
				expect(res.failures[0].challenge).to.equal('CHALLENGE1');
				expect(res.failures[0].status).to.equal('STATUS2');
			})
				.then(done)
				.catch(function() {
					expect('Error').to.equal(false);
					done();
				});
		});
	});

});
