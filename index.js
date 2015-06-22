'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var passport = require('passport');
var jwt = require('jsonwebtoken');

module.exports = function(config, seneca_instance) {
    var seneca = seneca_instance || require('seneca')();

    config.auth.strategyFolder = config.auth.strategyFolder || './strategies';

    _.each(fs.readdirSync(config.auth.strategyFolder), function(file) {
        if (file[0] == '.') { return; }
    	let fileNoJs = _.initial(file.split('.')).join('.');
    	require(`${config.auth.strategyFolder}/${file}`)(
    		passport,
    		_.extend(_.cloneDeep(config.auth.common), config.auth[fileNoJs])
    	);
    });

	passport.framework(require('./passport-fw-seneca-json'));

	var mapArgsToAuth = function(args) {
		var newSession = {};

		const params                      = {
			session: ['request_token', 'oauth_token_secret'],
			query  : ['oauth_token', 'oauth_verifier', 'code', 'client_id']
		};
		newSession['oauth:' + args.strategy] = _.pick(args.session, params.session);

		return {
			session: newSession,
			query  : _.pick(args.query, params.query)
		}
	};

    seneca.addAsync({system: 'auth', action: 'auth'}, function (args) {
        let auth = passport.authenticate(args.strategy);
        var session = {};

        return auth(mapArgsToAuth(args, session))
            .then(response => handlers.get(response.result)(response, session, args.strategy))
    });

    var handlers = {
        redirect: function(response, session, strategy) {
            response.oauth_token_secret = _.get(session, `['oauth:${strategy}'].oauth_token_secret`);
            return response;
        },

        success: function(response) {
	        if (config.auth.autoLogin) {
		        return seneca.actAsync({ system: 'user', action: 'login', query: response })
			        .then(function(response) {
				        var token = jwt.sign(
					        { detail: { name: response.user.name } },
					        process.env.JWT_KEY,
					        { expiresInMinutes: config.auth.expiry, subject: response.user.id }
				        );
				        return { success: true, result: 'success', user: response.user, jwt: token };
			        });
	        } else {
		        return { success: true, result: 'success', auth: response };
	        }
        },

        get: function(name) {
            return this[name] || function() { return Promise.reject(`Unknown response ${name}`) }
        }
    };

    return {
        koa: function() { return require('./seneca-auth-koa')(seneca); }
    };
};

module.exports.koa = function(seneca) { return require('./seneca-auth-koa')(seneca); };
