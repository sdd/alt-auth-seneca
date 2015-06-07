/**
 * Passport Framework for Seneca, JSON communication
 */
'use strict';
var Promise = require('bluebird');

function defer() {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}


exports.initialize = function() {};

exports.authenticate = function authenticate(passport, name, options) {
	options = options || {};

	// Cast `name` to an array, allowing authentication to pass through a chain of
	// strategies.  The first strategy to succeed, redirect, or error will halt
	// the chain.  Authentication failures will proceed through each strategy in
	// series, ultimately failing if all strategies fail.
	//
	// This is typically used on API endpoints to allow clients to authenticate
	// using their preferred choice of Basic, Digest, token-based schemes, etc.
	// It is not feasible to construct a chain of multiple strategies that involve
	// redirection (for example both Facebook and Twitter), since the first one to
	// redirect will halt the chain.
	if (!Array.isArray(name)) {
		name = [name];
	}

	return function authenticate(message) {

		var failures = [];

		var response = defer();

		function allFailed() {
			response.resolve({
				success: false,
                result: 'failure',
				failures: failures
			});
		}

		(function attempt(i) {
			var layer = name[i];
			// If no more strategies exist in the chain, authentication has failed.
			if (!layer) { return allFailed(); }

			// Get the strategy, which will be used as prototype from which to create
			// a new instance.  Action functions will then be bound to the strategy
			// within the context of the HTTP request/response pair.
			var prototype = passport._strategy(layer);
			if (!prototype) {
				response.reject(new Error('Unknown authentication strategy "' + layer + '"'));
				return;
			}

			var strategy = Object.create(prototype);


			// ----- BEGIN STRATEGY AUGMENTATION -----
			// Augment the new strategy instance with action functions.  These action
			// functions are bound via closure the the request/response pair.  The end
			// goal of the strategy is to invoke *one* of these action methods, in
			// order to indicate successful or failed authentication, redirect to a
			// third-party identity provider, etc.

			/**
			 * Authenticate `user`, with optional `info`.
			 *
			 * Strategies should call this function to successfully authenticate a
			 * user.  `user` should be an object supplied by the application after it
			 * has been given an opportunity to verify credentials.  `info` is an
			 * optional argument containing additional user information.  This is
			 * useful for third-party authentication strategies to pass profile
			 * details.
			 *
			 * @param {Object} user
			 * @param {Object} info
			 * @api public
			 */
			strategy.success = function(user, info) {
				response.resolve({
					success: true,
					result : 'success',
					user   : user,
					info   : info
				});
			};

			/**
			 * Fail authentication, with optional `challenge` and `status`, defaulting
			 * to 401.
			 *
			 * Strategies should call this function to fail an authentication attempt.
			 *
			 * @param {String} challenge
			 * @param {Number} status
			 * @api public
			 */
			strategy.fail = function(challenge, status) {
				if (typeof challenge == 'number') {
					status = challenge;
					challenge = undefined;
				}

				// push this failure into the accumulator and attempt authentication
				// using the next strategy
				failures.push({ challenge: challenge, status: status });
				attempt(i + 1);
			};

			/**
			 * Redirect to `url` with optional `status`, defaulting to 302.
			 *
			 * Strategies should call this function to redirect the user (via their
			 * user agent) to a third-party website for authentication.
			 *
			 * @param {String} url
			 * @param {Number} status
			 * @api public
			 */
			strategy.redirect = function(url, status) {
				response.resolve({
					success: true,
					result: 'redirect',
					url: url,
					status: status
				});
			};

			/**
			 * Pass without making a success or fail decision.
			 *
			 * Under most circumstances, Strategies should not need to call this
			 * function.  It exists primarily to allow previous authentication state
			 * to be restored, for example from an HTTP session.
			 *
			 * @api public
			 */
			strategy.pass = function() {
				//next();
			};

			/**
			 * Internal error while performing authentication.
			 *
			 * Strategies should call this function when an internal error occurs
			 * during the process of performing authentication; for example, if the
			 * user directory is not available.
			 *
			 * @param {Error} err
			 * @api public
			 */
			strategy.error = function(err) {
				response.reject(err);
			};

			// ----- END STRATEGY AUGMENTATION -----

			strategy.authenticate(message, options);
		})(0); // attempt

		return response.promise;
	}
};



