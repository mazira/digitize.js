#digitize.js
Digitize.js utilizes the digitize.io API service to OCR files. For more information, visit [https://digitize.io/](https://digitize.io/).

##Install
	$ npm install git://github.com/mazira/digitize.js#master


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
	},
	format: 'hocr'	//service will return hOCR output. Unless specified, the OCRed text is returned
};

myDigitize.fullOCR(stream, options, function(err, content) {
	if (err)
		console.log(err);
	else
		console.log(content);	
});
`````

For more control over posting the file and querying the service for the content, you can use the ocr and fetch methods.

Using .ocr and .fetch:
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
			if(err) 
				console.log(err);
			else {
				console.log(status);
				console.log(content); 
			}
		});
	}
);
`````

As it takes time to OCR the files, the `status` will be _In Progress_ at first and `content` will be undefined. The fetch method can be called repeatedly until the `status` is _success_. When the status is _success_, the `content` will contain the content resulting from the OCR processing.

The processing time will vary based on the size of the file.

##Options
The Digitize default options:
`````javascript
{
	apiKey: '',
	verbose: false //Generates log messages if set to true
}
`````

- apiKey - A valid API key for the service. The list of a users valid keys can be found on [https://digitize.io/keys](https://digitize.io/keys)

##Methods
### #fullOCR(source, [options], callback)

- source - Either a file or node.js readableStream
- options - Various options
  - headers - HTTPS headers used to send the file to the service. When using streams, only the content-type header is necessary. For files, headers are not needed. Additional valid HTTPS headers can also be specified. 
    - content-type - MIME type (e.g. 'image/tiff')
  - frequency - (Optional) The frequency with which to query the service for the status of the OCR processing - in milliseconds. Default is 10000 ms.
  - interval - (Optional) The time interval during which the the service should be queried. Default is 120000 ms.
  - format - (Optional) Specifies the desired output format (hocr or json). By default, the OCRed text is returned   
- callback(err, content) - returns the OCRed content in `content`

Sends a file to the service to be OCRed and then returns the OCRed content. This combines the ocr and fetch methods into a single method. 

With the default frequency and interval the service will be queried for the OCR content until it is successfully returned, or every 10 seconds for a maximum of 2 minutes.

### #ocr(source, [options], callback)

- source - same as fullOCR
- options - HTTPS headers
  - headers - HTTPS headers used to send the file to the service. Additional HTTPS headers can be specified.
    - content-type - MIME type. Necessary for streams.
- callback(err, sessionId) - returns a sessionId for a valid request.

Sends a file to the service to be OCRed. The service then returns a sessionId to identify the request.
### #fetch(sessionId, callback)

- sessionId - The sessionId used to identify the request (returned by the ocr method)
- options
  - format - Format of returned content (hocr or json). By Default, the OCRed text is returned
- callback(err, status, content) - returns the OCRed text. `status` indicates the status of the OCR processing (_In Progress_, _Success_, or _Failed_). `content` contains the OCRed text if the `status` is _Success_ (it is otherwise undefined). 

Uses a sessionId to query the service for the status of a request, and returns the OCRed text when the processing is complete.


##TODO
- Add additional unit tests
