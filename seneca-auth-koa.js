'use strict';
var     _ = require('lodash'),
    router = require('koa-router')();

const defaults = {
    auth_url: '/auth/:strategy',
    callback_url: '/auth/:strategy/callback'
};

const scriptResponse = function(message) {
	return `<script>try{window.opener.postMessage('${message}',window.location.origin)}catch(e){}window.close()</script>`;
};

module.exports = function(seneca_instance, options) {
    var seneca = seneca_instance || require('seneca')();

    options = _.extend(defaults, options);

    const buildAuthArgs = function(ctx) {
        const maps = [
            { source: 'request.query', params: ['request_token', 'oauth_verifier', 'oauth_token', 'code', 'client_id'] },
            { source: 'session', params: ['oauth_token_secret'] }
        ];
        let authArgs = _.reduce(maps, (acc, map) =>
            _.extend(acc, _.pick(_.get(ctx, map.source), map.params))
        , {});

        return _.extend(authArgs, { system: 'auth', action: 'auth', strategy: ctx.strategy });
    };

    router.param('strategy', function *(strategy, next) {
        this.strategy = strategy;
        if (!this.strategy) return this.status = 404;
        yield next;
    });

    router.get(options.auth_url, function* () {
        var result = yield seneca.actAsync(buildAuthArgs(this));
        if (result.oauth_token_secret) {
            this.session.oauth_token_secret = result.oauth_token_secret;
            delete result.oauth_token_secret;
        }
        this.body = result;
    });

    router.get(options.callback_url, function* () {

        var authResponse = yield seneca.actAsync(buildAuthArgs(this));

        if (authResponse.result === 'success') {
	        console.info(authResponse);
            this.cookies.set('jwt', authResponse.jwt, { signed: true });
            this.session = null;

            this.body = scriptResponse('authTokenSet');
        } else {
	        this.body = scriptResponse('authTokenFailed');
        }
    });

    return router.middleware();
};
