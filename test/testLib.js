var Digitize = require('./../lib/digitize');
var fs = require('fs');


var myDigitize = new Digitize({
	apiKey: '18698969ada0ad1af754fb63c0cbd0878ef28b21'
});

var file =  '../resources/multi-page.tif';
//var stream = fs.createReadStream(file);

var options = {
    //contentType: 'image/tiff'
};

var no_options;


myDigitize.ocr(file, options, function(err, sessionId) {
	if (err) console.log(err);
	console.log('Sessionid: ' + sessionId + '\n\n');

	setTimeout(function() {
		myDigitize.fetch(sessionId, function(err, status, content) {
			if(err) console.log(err);
			console.log(status + '\n\n');
			console.log(content);
		})
	}, 20000);
});
