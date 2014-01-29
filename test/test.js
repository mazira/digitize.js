// node modules
var fs = require('fs'),

// npm modules
	nock = require('nock'),
	should = require('should'),

// project modules
	Digitize = require('./../lib/digitize');


var file_valid = './resources/test_files/basic.tif',
	file_empty = './resources/test_files/empty.tif',
	file_invalid = '/not/a/real/filepath.tif';

var myDigitize = new Digitize({
	apiKey: '123456789'
});

var invalidKeyDigitize = new Digitize({
	apiKey: '987654321'
});

var options_good = {
	headers: {
		'content-type': 'image/tiff'
	}
};

describe('Digitize', function() {

	describe('Constructor', function () {

		it('should have default options', function () {
			myDigitize.should.be.an['instanceof'](Digitize);

			myDigitize.options.apiKey.should.equal('123456789');
			myDigitize.options.verbose.should.equal(false);
		});

		it('should allow overriding of default options', function () {
			var newDigitize = new Digitize({
				apiKey: '123',
				verbose: true
			});

			newDigitize.options.verbose.should.equal(true);
		});
	});

	describe('#fullOCR', function() {

		it('should return the OCRed content for a valid file', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				})
				.get('/api/ocr?apiKey=123456789&sessionId=1111aaaa2222bbbb&format=')
				.reply(200, "OCRed text");

			myDigitize.fullOCR(file_valid, function(err, content) {
				scope.done();

				should.not.exist(err);
				should.exist(content);

				content.should.equal('OCRed text');

				cb();
			});
		});

		it('should return the OCRed content for a valid stream', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				})
				.get('/api/ocr?apiKey=123456789&sessionId=1111aaaa2222bbbb&format=')
				.reply(200, "OCRed text");

			var stream_valid = fs.createReadStream(file_valid);

			myDigitize.fullOCR(stream_valid, options_good, function(err, content) {
				scope.done();

				should.not.exist(err);
				should.exist(content);

				content.should.equal('OCRed text');

				cb();
			});
		});

		it('should return an error when the interval is shorter than the frequency', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				});

			var fastOptions = {
				frequency: 10000,
				interval: 1
			};

			myDigitize.fullOCR(file_valid, fastOptions, function(err, content) {
				scope.done();

				should.exist(err);

				err.message.should.equal('Task frequency must be less than or equal to interval');

				cb();
			});
		});

		it('should return an error when the interval has passed', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				})
				.get('/api/ocr?apiKey=123456789&sessionId=1111aaaa2222bbbb&format=')
				.reply(200, {
					status: 'In Progress'
				}, {
					'content-type': 'application/json; charset=utf-8'
				})
				.get('/api/ocr?apiKey=123456789&sessionId=1111aaaa2222bbbb&format=')
				.reply(200, {
					status: 'In Progress'
				}, {
					'content-type': 'application/json; charset=utf-8'
				});

			var fastOptions = {
				frequency: 500,
				interval: 1000
			};

			myDigitize.fullOCR(file_valid, fastOptions, function(err, content) {
				scope.done();

				should.exist(err);

				err.message.should.equal('Task did not finish before the interval expired');

				cb();
			});
		});

		it('should return an error when frequency or interval are not numbers', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				});

			var fastOptions = {
				frequency: 'K. 527',
				interval: 'Pyotr'
			};

			myDigitize.fullOCR(file_valid, fastOptions, function(err, content) {
				scope.done();

				should.exist(err);

				err.message.should.equal('Task frequency and interval must be numbers in milliseconds');

				cb();
			});
		});
	});

	describe('#ocr', function() {

		it('should return a sessionId for a valid file and apiKey', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				});

			myDigitize.ocr(file_valid, function(err, sessionId) {
				scope.done();

				should.not.exist(err);
				should.exist(sessionId);

				sessionId.should.equal('1111aaaa2222bbbb');

				cb();
			});
		});

		it('should return an error for a nonexistent file', function(cb) {
			myDigitize.ocr(file_invalid, function(err) {
				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('File path does not exist');

				cb();
			});
		});

		it('should return an error for an empty file', function(cb) {
			myDigitize.ocr(file_empty, function(err) {
				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('Cannot open file. File is empty');

				cb();
			});
		});

		it('should return a sessionId for a valid stream, options, and apiKey', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=123456789')
				.reply(202, {
					message: 'Your request has been queued',
					sessionId: '1111aaaa2222bbbb'
				});

			var stream_valid = fs.createReadStream(file_valid);

			myDigitize.ocr(stream_valid, options_good, function(err, sessionId) {
				scope.done();

				should.not.exist(err);
				should.exist(sessionId);

				sessionId.should.equal('1111aaaa2222bbbb');


				cb();
			});
		});

		it('should return an error for a valid stream and apiKey, and no options', function(cb) {
			var stream_valid = fs.createReadStream(file_valid);

			myDigitize.ocr(stream_valid, function(err, sessionId) {

				should.exist(err);
				err.should.be.an['instanceof'](Error);

				err.message.should.equal('Cannot determine file type of stream. Include content-type header in options');

				cb();
			});
		});

		it('should return an error for an invalid stream', function(cb) {
			var stream_invalid = fs.createWriteStream(file_empty);

			myDigitize.ocr(stream_invalid, options_good, function(err) {
				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('Invalid stream');

				cb();
			});
		});

		it('should return an error for an invalid apiKey', function(cb) {
			var scope = nock('https://digitize.io')
				.post('/api/ocr?apiKey=987654321')
				.reply(403, {
					message: 'Invalid API Key'
				});

			invalidKeyDigitize.ocr(file_valid, function(err) {
				scope.done();

				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('Invalid API Key');

				cb();
			});
		});
	});


	describe('#fetch', function() {

		it('should return the OCRed content for a valid sessionId', function(cb) {
			var scope = nock('https://digitize.io')
				.get('/api/ocr?apiKey=123456789&sessionId=1111aaaa2222bbbb&format=')
				.reply(200, "OCRed text");

			myDigitize.fetch('1111aaaa2222bbbb', function(err, status, content) {
				scope.done();

				should.not.exist(err);
				should.exist(status);
				should.exist(content);

				status.should.equal('Success');
				content.should.equal('OCRed text');

				cb();
			})
		});

		it('should return an error for an invalid sessionId', function(cb) {
			var scope = nock('https://digitize.io')
				.get('/api/ocr?apiKey=123456789&sessionId=1&format=')
				.reply(404, {
					status: 'Failed',
					message: 'No such session'
				}, {
					'content-type': 'application/json; charset=utf-8'
				});

			myDigitize.fetch('1', function(err) {
				scope.done();

				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('No such session');

				cb();
			});
		});

		it('should return an error for no sessionId', function(cb) {
			myDigitize.fetch(function(err) {
				should.exist(err);

				err.should.be.an['instanceof'](Error);
				err.message.should.equal('No sessionId');

				cb();
			});
		});
	});
});