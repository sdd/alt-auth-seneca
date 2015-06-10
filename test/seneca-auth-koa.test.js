"use strict";
var request         = require('supertest'),
    koa             = require('koa'),
    mount           = require('koa-mount'),
    router          = require('koa-router'),
    Promise         = require('bluebird'),
    chai            = require("chai"),
    sinon           = require("sinon"),
    expect          = chai.expect;

chai.use(require("sinon-chai"));

var senecaAuthKoa = require('../seneca-auth-koa');

describe('seneca-auth-koa', function() {

    describe('GET /auth/twitter', function() {

        var senecaActStub = sinon.stub();
        var senecaMock = { actAsync: senecaActStub };
        var app = koa().use(senecaAuthKoa(senecaMock));
        senecaActStub.returns(Promise.resolve({}));

        var testRouter = router()
            .get('/auth/twitter', function * (next) {
                this.session = {
                    oauth_token_secret: 'test',
                    should_not_be_here: 'test'
                };
                yield next;
            });

        var superApp = koa()
            .use(testRouter.routes())
            .use(mount('/', app));


        it('should pass the correct system and action to seneca', function(done) {

            request(superApp.listen())
                .get('/auth/twitter')
                .end(function() {

                    expect(senecaActStub.args[0][0].system).to.equal('auth');
                    expect(senecaActStub.args[0][0].action).to.equal('auth');

                    done();
                });
        });

        it('should pass the correct system and action to seneca2', function(done) {

            var senecaActStub = sinon.stub();
            var senecaMock = { actAsync: senecaActStub, test2: 2 };
            var app = koa().use(senecaAuthKoa(senecaMock));
            senecaActStub.returns(Promise.resolve({}));

            request(app.listen())
                .get('/auth/twitter')
                .end(function() {

                    expect(senecaActStub.args[0][0].system).to.equal('auth');
                    expect(senecaActStub.args[0][0].action).to.equal('auth');

                    done();
                });
        });

        it('should pass the correct strategy to seneca', function(done) {
            var senecaActStub = sinon.stub();
            var senecaMock = { actAsync: senecaActStub };
            var app = koa().use(senecaAuthKoa(senecaMock));
            senecaActStub.returns(Promise.resolve({}));

            request(app.listen())
                .get('/auth/twitter')
                .end(function() {
                    expect(senecaActStub.args[0][0].strategy).to.equal('twitter');

                    done();
                });
        });

        it('should pass only necessary args from session to seneca', function(done) {
            var senecaActStub = sinon.stub();
            var senecaMock = { actAsync: senecaActStub };
            var app = koa().use(senecaAuthKoa(senecaMock));
            senecaActStub.returns(Promise.resolve({}));

            var testRouter = router()
                .get('/auth/twitter', function * (next) {
                    this.session = {
                        oauth_token_secret: 'test',
                        should_not_be_here: 'test'
                    };
                    yield next;
                });

            var superApp = koa()
                .use(testRouter.routes())
                .use(mount('/', app));

            request(superApp.listen())
                .get('/auth/twitter')
                .expect(function() {

                    expect(senecaActStub.args[0][0].oauth_token_secret).to.equal('test');
                    expect(senecaActStub.args[0][0].should_not_be_here).to.equal(undefined);
                })
                .end(done);
        });

        //it('should pass only necessary args from query to seneca', function(done) {
        //    var senecaActStub = sinon.stub();
        //    var senecaMock = { actAsync: senecaActStub };
        //    var app = koa().use(senecaAuthKoa(senecaMock));
        //    senecaActStub.returns(Promise.resolve({}));
        //
        //    request(app.listen())
        //        .get('/auth/twitter')
        //        .query({
        //            'request_token': 'test1',
        //            'oauth_verifier': 'test2',
        //            'oauth_token': 'test3',
        //            'code': 'test4',
        //            'client_id': 'test5',
        //            'should_not_be_here': 'test'
        //        }).end(function() {
        //            expect(senecaActStub.args[0][0].request_token).to.equal('test1');
        //            expect(senecaActStub.args[0][0].oauth_verifier).to.equal('test2');
        //            expect(senecaActStub.args[0][0].oauth_token).to.equal('test3');
        //            expect(senecaActStub.args[0][0].code).to.equal('test4');
        //            expect(senecaActStub.args[0][0].client_id).to.equal('test5');
        //            expect(senecaActStub.args[0][0].should_not_be_here).to.equal(undefined);
        //
        //            done();
        //        });
        //});

        //it('should set move oauth_token_secret from result to session if present', function(done) {
        //
        //    var senecaResponse = {
        //        oauth_token_secret: 'oauth_token_secret'
        //    };
        //
        //    var session = {};
        //
        //    var senecaActStub = sinon.stub();
        //    var senecaMock = { actAsync: senecaActStub };
        //    var app = koa().use(senecaAuthKoa(senecaMock));
        //    senecaActStub.returns(Promise.resolve(senecaResponse));
        //
        //    var testRouter = router()
        //        .get('/auth/twitter', function * (next) {
        //            this.session = session;
        //            yield next;
        //        });
        //
        //    var superApp = koa()
        //        .use(testRouter.routes())
        //        .use(mount('/', app));
        //
        //    request(superApp.listen())
        //        .get('/auth/twitter')
        //        .expect(200)
        //        .end(function(err, res) {
        //
        //            expect(res.oauth_token_secret).to.equal(undefined);
        //            expect(session.oauth_token_secret).to.equal('oauth_token_secret');
        //
        //            done();
        //        });
        //});

        it('should set the body to the response from seneca', function() {

        });
    });

    describe('GET /auth/twitter/callback', function() {
        it('should pass the correct system and action to seneca', function() {

        });

        it('should pass the correct strategy to seneca', function() {

        });

        it('should pass only necessary args from session to seneca', function() {

        });

        it('should pass only necessary args from query to seneca', function() {

        });

        describe('successful seneca response', function() {
            it('should set the jwt cookie correctly', function() {

            });

            it('should clear the session', function() {

            });

            it('should respond with a body containing a script that calls postmessage with authTokenSet', function() {

            });
        });

        describe('failure seneca response', function() {
            it('should not set the jwt cookie', function () {

            });

            it('should not clear the session', function() {

            });

            it('should respond with a body containing a script that calls postmessage with authTokenFailed', function() {

            });
        });
    });
});
