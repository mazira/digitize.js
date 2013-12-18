
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
	verbose : false     //used to log to the console, when true(eventually)
};

Digitize.prototype.ocr = function(source, options, cb) {
	var o1 = this;

	options = options || {};

	//Ensure that the source exists
	if (!source) {
		return cb(new Error('No file source'));
	}

	var aFile = typeof source === 'string';

	//If source is a stream, ensure that it is readable
	if (!aFile && source.readable !== true) {
		return cb(new Error('Invalid stream'));
	}

	if (!aFile) {
		source.pause();
	}

	var contentType = options.contentType;

	if (!contentType) {
		if (aFile) {
			contentType = mime.lookup(source);
		} else
			return cb(new Error('Cannot determine file type. Specify the file type in the options.'));
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
		if (err) {
			return cb(new Error('File path does not exist'));
		}

		var headers = {};

		options.headers = headers;

		if (aFile) {
			headers['content-length'] = result.stats.size;
		} else if (options.headers['content-length']) {
			headers['content-length'] = options.headers['content-length'];
		}

		if(contentType) {
			headers['content-type'] = contentType;
		}

		if(aFile) {
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

	//Ensure that sessionId exists
	if (!sessionId)
		return cb(new Error('No sessionId'));

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

			//Check if the operation was successful or an error occurred.
			if (output.reason) {
				return cb(new Error(output.reason));
			} else {
				return cb (null, output.status, output.content);
			}
		});
	});

	req.on('error', function(e) {
		return cb(e);
	});

	req.end();
};

module.exports = Digitize;

/* TODO: Correctly accept and use streams, + files. Also, return ocr'd text

 */
