#digitize.js
Digitize.js utilizes the digitize.io API service to OCR files. For more information, visit [https://digitize.io/](https://digitize.io/).

##Usage
A quick example

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


As it takes time to OCR the files, the `status` will be _In Progress_ at first and `content` will be undefined. The fetch method can be called repeatedly until the `status` is _success_, but it is also possible to use a timer:

    setTimeout(function{
    	myDigitize.fetch(sessionId, function(err, status, content) {
    		if(err) console.log(err);

    		console.log(status);
    		console.log(content);
    	});
    }, 20000);

When the status is _success_, the `content` will contain the text resulting from the OCR processing.

The processing time will vary based on the size of the file.

##Options
    {
    	headers: {
    	    'content-type': <Mime type>
    	}
    }

+ -content-type: Mime type specification (Necessary for streams)

Other HTTP headers can be included, although they are not necessary.

##Methods

###.ocr
Digitize.ocr(source, options, function(err, sessionId) {


);

+ -source: Either a file or node.js stream
+ -options: Only needed when source is a stream
+ -sessionId: The sessionId returned by the API

###.fetch

Digitize.fetch(sessionId, function(err, status, content) {

});

+ -sessionId: The sessionId used to identify the request (returned by the .ocr method)
+ -status: The status of the OCR processing ('In Progress', 'Success', or 'Failed')
+ -content: The OCRed text, if the status is 'Success'. Otherwise, undefined.

##TODO
+ Add verbose option to allow logging
+ 