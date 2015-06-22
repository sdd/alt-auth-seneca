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

	if (!Array.isArray(name)) { name = [name]; }

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

			var prototype = passport._strategy(layer);
			if (!prototype) {
				response.reject(new Error('Unknown authentication strategy "' + layer + '"'));
				return;
			}

			var strategy = Object.create(prototype);

			strategy.success = function(user, info) {
				response.resolve({
					success: true,
					result : 'success',
					user   : user,
					info   : info
				});
			};

			strategy.fail = function(challenge, status) {
				if (typeof challenge == 'number') {
					status = challenge;
					challenge = undefined;
				}

				failures.push({ challenge: challenge, status: status });
				attempt(i + 1);
			};

			strategy.redirect = function(url, status) {
				response.resolve({
					success: true,
					result: 'redirect',
					url: url,
					status: status
				});
			};

			strategy.pass = function() {
				//next();
			};

			strategy.error = response.reject;

			strategy.authenticate(message, options);
		})(0); // attempt

		return response.promise;
	}
};
