#digitize.js
Digitize.js utilizes the digitize.io API service to OCR files. For more information, visit [https://digitize.io/](https://digitize.io/).

##Install
	$ git clone https://github.com/mazira/digitize.js.git


##Usage
A quick example:
`````javascript
var Digitize = require('digitize');
var fs = require('fs');

var myDigitize = new Digitize({
	apiKey: <Your apiKey>
});

var stream = fs.createReadStream('./file.tif');

var options = {
	headers: {
		'content-type': 'image/tiff'
	}
};

myDigitize.ocr(stream, options, function(err, sessionId) {
	if(err) 
		console.log(err);
	else {
		myDigitize.fetch(sessionId, function(err, status, content) {
			if(err) console.log(err);

			console.log(status);
			console.log(content);
		});
	}
);
`````

As it takes time to OCR the files, the `status` will be _In Progress_ at first and `content` will be undefined. The fetch method can be called repeatedly until the `status` is _success_, but it is also possible to use a timer:

`````javascript
setTimeout(function{
	myDigitize.fetch(sessionId, function(err, status, content) {
		if(err) console.log(err);

		console.log(status);
		console.log(content);
	});
}, 20000);
`````

When the status is _success_, the `content` will contain the text resulting from the OCR processing.

The processing time will vary based on the size of the file.

##Options
The Digitize default options:
`````javascript
{
	apiKey: ''
}
`````

- apiKey - A valid API key for the service. The list of a users valid keys can be found on [https://digitize.io/keys](https://digitize.io/keys)

##Methods

### #ocr(source, [options], callback)

- source - Either a file or node.js stream
- options - HTTPS headers used to send the file to the service. When using streams, only the content-type header is necessary. For files, no options are needed.
- callback(err, sessionId) - returns a sessionId for a valid request

Sends a file to the service to be OCRed. The service then returns a sessionId to identify the request.
### #fetch(sessionId, callback)

- sessionId - The sessionId used to identify the request (returned by the .ocr method)
call
- callback(err, status, content) - returns the OCRed text. `status` indicates the status of the OCR processing (_In Progress_, _Success_, or _Failed_). `content` contains the OCRed text if the `status` is _Success_ (it is otherwise undefined). 

Uses a sessionId to query the service for the status of a request, and returns the OCRed text when the processing is complete.


##TODO

- Add verbose option to allow logging
