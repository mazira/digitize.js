//node modules
var https = require('https');
var fs = require('fs');

//npm modules
var mime = require('mime');
var async = require('async');

var Digitize = function (options) {
	this.options = Object.create(Digitize.defaultOptions);

	for (var x in options) {
		if (options.hasOwnProperty(x)) {
			this.options[x] = options[x];
		}
	}
};

Digitize.defaultOptions = {
	apiKey : '',
	verbose : false,
	logger: console.log
};

/**
 * Sends a file to the service to be OCRed
 * @param {string|stream} source - Either the path to a file (as a string)
 * or a ReadableStream, for the file to be posted to the service
 * @param {{headers: Object}} options - HTTPS headers used for posting the file
 * @param {function(Error, sessionId)} cb - Callback function. Receives any errors and sessionId
 * from the service
 */
Digitize.prototype.ocr = function(source, options, cb) {
	var o1 = this;
	o1._log('Sending file to be OCRed...');

	// If no options are provided, make options null
	if (typeof options == 'function') {
		cb = options;
		options = null;
	}

	options = options || {};

	// Ensure that the source exists
	if (!source || typeof source == 'function') {
		cb = source;
		return cb(new Error('No file source'));
	}

	var aFile = typeof source === 'string';

	// If source is a stream, ensure that it is readable
	if (!aFile && source.readable !== true)
		return cb(new Error('Invalid stream'));

	if (!aFile)
		source.pause();

	// Determine MIME content-type
	var contentType = '';

	// Set content-type from options, if provided by user
	if (options.headers && options.headers['content-type'])
		contentType = options.headers['content-type'];

	if (!contentType) {
		if (aFile)
			contentType = mime.lookup(source);
		else
			return cb(new Error('Cannot determine file type of stream. Include content-type header in options'));
	}

	async.parallel({
		stats: function(cb) {
			if (aFile)
				fs.stat(source, cb);
			else
				cb();
		}
	},
	function(err, result) {
		if (err)
			return cb(new Error('File path does not exist'));

		// If a file, check if file is empty
		if (aFile && result.stats.size === 0)
			return cb(new Error('Cannot open file. File is empty'))

		var headers = {};

		if (!options.headers)
			options.headers = headers;
		else {
			for (var x in options.headers) {
				if (options.headers.hasOwnProperty(x)) {
					headers[x] = options.headers[x];
				}
			}
		}

		if (aFile) {
			headers['content-type'] = contentType;
			headers['content-length'] = headers['content-length'] || result.stats.size;
			source = fs.createReadStream(source);
		}

		//Options for HTTPS POST request
		var postOptions = {
			host: 'digitize.io',
			path: '/api/ocr?apiKey=' + o1.options.apiKey,
			method: 'POST',
			headers: headers
		};

		var req = https.request(postOptions, function(res) {

			res.on('data', function (chunk) {
				var output = JSON.parse(chunk);

				if (res.statusCode !== 202)
					return cb(new Error(output.message));
				else {
					o1._log('Received sessionId - ' + output.sessionId + '\n');
					return cb(null, output.sessionId);
				}
			});
		});

		source.resume();

		source.on('data', function(data) {
			req.write(data);
		});

		source.on('end', function() {
			req.end();
		});

		req.on('error', function(e) {
			return cb(e);
		});
	});
};

/**
 * Queries the service for the status and content of a specific OCRing task
 * @param {String} sessionId - used to identify the OCR process
 * @param {function(Error, status, content)} cb - Callback function. Receives
 * the status, and if applicable, content of an OCRed file
 */

Digitize.prototype.fetch = function (sessionId, cb) {
	var o1 = this;
	o1._log('Querying service for status...');

	// Ensure that sessionId exists
	if (!sessionId || typeof sessionId == 'function') {
		cb = sessionId;
		return cb(new Error('No sessionId'));
	}

	//Options for HTTPS GET request
	var getOptions = {
		host: 'digitize.io',
		path: '/api/ocr?apiKey=' + o1.options.apiKey + '&sessionId=' + sessionId,
		method: 'GET'
	};

	var req = https.request(getOptions, function(res) {

		var output = '';

		res.on('data', function (chunk) {
			output = JSON.parse(chunk);
		});

		res.on('end', function() {

			// Check if the operation was successful
			if (output.message)
				return cb(new Error(output.message));
			else if (output.reason)
				return cb(new Error(output.reason));
			else {
				o1._log('Status - ' + output.status + '\n');
				return cb (null, output.status, output.content);
			}
		});
	});

	req.on('error', function(e) {
		return cb(e);
	});

	req.end();
};

/**
 * Posts a file to the service and queries the service with a set
 * frequency, until a set interval has passed. If a query is successful,
 * the OCRed content of the file will be returned with the Callback function
 * @param {string|stream} source - Either the path to a file (as a string)
 * or a ReadableStream, for the file to be posted to the service
 * @param {{headers: Object|undefined, frequency: Number|undefined, interval: Number|undefined}} options - HTTPS headers;
 * values for runAtInterval
 * @param {function(Error, data)} cb - Callback function. Receives the error and data from
 * runAtInterval
 */
Digitize.prototype.fullOCR = function(source, options, cb) {
	var o1 = this;

	if (typeof options === 'function') {
		cb = options;
		options = null;
	}

	options = options || {};

	async.waterfall([
		function(callback){
			o1.ocr(source, options, callback);
		},

		function(sessionId, callback) {
			var fetchWorker = function (_callback) {
				o1.fetch(sessionId, function(err, status, content) {
					if (err) {
						return _callback(err);
					}
					else if (status !== 'In Progress')
						return _callback(err, content);
				});
			};
			o1.runAtInterval(fetchWorker, options.frequency, options.interval, callback);
		}
	],
		function (err, content ) {
			return cb(err, content);
		}
	);
};

/**
 * Runs a function with a frequency over a time interval
 * @param process {function(function(Error, data))} a work function which takes a single parameter
 * @param {int} freq - the frequency with which the function should be run (in milliseconds)
 * @param {int} interval - the total period over which the function should be run with
 * the given freq (in milliseconds)
 * @param {function(Error, data)} cb - Callback function. Receives the error and data
 * from process, the work function
 */
Digitize.prototype.runAtInterval = function(process, freq, interval, cb) {

	if (typeof interval === 'function') {
		cb = interval;
		interval = null;
	}

	if (typeof freq === 'function') {
		cb = freq;
		freq = null;
	}

	if (typeof process !== 'function')
		return cb(new Error('Invalid process. The process to run must be a valid function'));

	//Defaults for freq and interval
	freq = freq || 10000;
	interval = interval || 30000;

	if (typeof freq !== 'number' || typeof interval !== 'number')
		return cb(new Error('Task frequency and interval must be numbers in milliseconds'));

	process(function(err, data) {
		if (timedOut)
			return;

		clearInterval(task);
		clearTimeout(timeout);

		if (data)
			return cb(null, data);
		else
			return cb(err);
	});

	var timedOut = false;

	var task = setInterval(function() {
		process(function (err, data) {
			if (timedOut)
				return;

			clearInterval(task);
			clearTimeout(timeout);

			if (data)
				return cb(null, data);
			else
				return cb(err);
		});
	}, freq);

	var timeout = setTimeout(function() {
		timedOut = true;
		clearInterval(task);
		return cb(new Error("OCRing was not successful"));
	}, interval);
};

Digitize.prototype._log = function () {
	arguments[0] = 'digitize.js: ' + arguments[0];
	if (this.options.verbose) {
		this.options.logger.apply(null, arguments);
	}
};

module.exports = Digitize;
