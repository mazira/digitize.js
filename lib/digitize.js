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
	verbose : false
};

Digitize.prototype.ocr = function(source, options, cb) {
	var o1 = this;

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
				else
					return cb(null, output.sessionId);
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

Digitize.prototype.fetch = function (sessionId, cb) {
	var o1 = this;

	// Ensure that sessionId exists
	if (!sessionId || typeof sessionId == 'function') {
		cb = sessionId;
		return cb(new Error('No sessionId'));
	}

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
			else
				return cb (null, output.status, output.content);
		});
	});

	req.on('error', function(e) {
		return cb(e);
	});

	req.end();
};

module.exports = Digitize;