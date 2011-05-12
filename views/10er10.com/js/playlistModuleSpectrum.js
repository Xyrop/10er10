 
$(document).one("bootstrap:playlist",function() {
// 	debug("the test : ","mozFrameBufferLength" in $("<audio />").get(0));
	if ( "mozFrameBufferLength" in $("<audio />").get(0)  == false ) {
		debug("not initializong spectrum");
		return ;
	}
	
	$("#side div.spectrumOption").slideDown("fast").find("input").attr("checked",false).bind("click",function() {
		if ( $(this).is(":checked") ) {
			enabled = true;
			$("#side div.spectrum").slideDown("fast");
			try {
				var a = d10.playlist.driver().current().audio;
				if ( a ) {
					newFFT(a);
				}
			}catch(e) {debug("unable to get current song",e);}
		} else {
			enabled = false;
			if ( fft ) {
				fft.removeListeners();
				fft = null;
			}
			$("#side div.spectrum").slideUp("fast");
		}
	});
	
	
	var canvas = $("#side div.spectrum").find("canvas").get(0);
	var enabled = false;
	var fft = null;
	
	var newFFT = function(audio) {
		if ( fft ) {
			fft.removeListeners();
			fft = null;
		}
		fft = new d10.ffSpectrum(audio, canvas);
	};
	
	
	var module = new d10.fn.playlistModule("spectrum",{
		"playlist:currentSongChanged": function() {
			if ( !enabled ) { return ; }
// 			if ( fft ) {
// 				fft.removeListeners();
// 				fft = null;
// 			}
			
			newFFT(d10.playlist.driver().current().audio);
// 			var s = d10.playlist.current();
// 			document.title = s.find(".title").text() + ' - '+ s.find(".artist").text();
		},
		"playlist:ended": function() {
			fft.removeListeners();
			fft = null;
// 			document.title = "10er10";
		}
	},{});

	d10.playlist.modules[module.name] = module;

});


d10.ffSpectrum = function(audio,canvas) {
	var fft,
		ctx = canvas.getContext('2d'),
		widthLimit = canvas.width / 2,
		channels,
		rate,
		frameBufferLength;
// 	ctx.fillStyle = '#9A9A9A';
// 	ctx.fillStyle = '#466777';
	function loadedMetadata() {
		channels          = audio.mozChannels;
		rate              = audio.mozSampleRate;
		frameBufferLength = audio.mozFrameBufferLength;
			
		fft = new d10.FFT(frameBufferLength / channels, rate);
	}

	var push = 0;

	function audioAvailable(event) {
		if ( !channels ) {
			debug("loading metadata");
			loadedMetadata();
			return ;
		}
		if ( push ) {
			push -= 1;
			return ;
		}
		push = 3;

		var fb = event.frameBuffer,
			t  = event.time, /* unused, but it's there */
			signal = new Float32Array(fb.length / channels),
			magnitude;
// 		var i;
		for (var i = 0, fbl = frameBufferLength / 16; i < fbl; i++ ) {
			// Assuming interlaced stereo channels,
			// need to split and merge into a stero-mix mono signal
			signal[i] = (fb[2*i] + fb[2*i+1]) / 2;
		}

		fft.forward(signal);
		// Clear the canvas before drawing spectrum
		ctx.clearRect(0,0, canvas.width, canvas.height);
		var baseColor = [70,103,155];
		var i;
		for (var  i = 0; i < widthLimit; i++ ) {
			// multiply spectrum by a zoom value
			magnitude = fft.spectrum[i] * 4000;
			ctx.fillStyle = 'rgb('+ baseColor.join(",")+')';
			baseColor[0] += 1;
			baseColor[1] += 1;
			baseColor[2] -= 1;
			// Draw rectangle bars for each frequency bin
			ctx.fillRect(i * 2, canvas.height, 1, -magnitude);
		}
// 		debug("i",i);
	}

// 	var audio = document.getElementById('audio-element');
	audio.addEventListener('MozAudioAvailable', audioAvailable, false);
	audio.addEventListener('loadedmetadata', loadedMetadata, false);
	return {
		removeListeners: function() {
			audio.removeEventListener('MozAudioAvailable', audioAvailable, false);
			audio.removeEventListener('loadedmetadata', loadedMetadata, false);
		}
	};
};

// FFT from dsp.js, see below
d10.FFT = function(bufferSize, sampleRate) {
	this.bufferSize   = bufferSize;
	this.sampleRate   = sampleRate;
	this.spectrum     = new Float32Array(bufferSize/2);
	this.real         = new Float32Array(bufferSize);
	this.imag         = new Float32Array(bufferSize);
	this.reverseTable = new Uint32Array(bufferSize);
	this.sinTable     = new Float32Array(bufferSize);
	this.cosTable     = new Float32Array(bufferSize);

	var limit = 1,
		bit = bufferSize >> 1;

	while ( limit < bufferSize ) {
		for ( var i = 0; i < limit; i++ ) {
			this.reverseTable[i + limit] = this.reverseTable[i] + bit;
		}

		limit = limit << 1;
		bit = bit >> 1;
	}

	for ( var i = 0; i < bufferSize; i++ ) {
		this.sinTable[i] = Math.sin(-Math.PI/i);
		this.cosTable[i] = Math.cos(-Math.PI/i);
	}
};

d10.FFT.prototype.forward = function(buffer) {
	var bufferSize   = this.bufferSize,
		cosTable     = this.cosTable,
		sinTable     = this.sinTable,
		reverseTable = this.reverseTable,
		real         = this.real,
		imag         = this.imag,
		spectrum     = this.spectrum;

	if ( bufferSize !== buffer.length ) {
		throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length;
	}

	for ( var i = 0; i < bufferSize; i++ ) {
		real[i] = buffer[reverseTable[i]];
		imag[i] = 0;
	}

	var halfSize = 1,
		phaseShiftStepReal,	
		phaseShiftStepImag,
		currentPhaseShiftReal,
		currentPhaseShiftImag,
		off,
		tr,
		ti,
		tmpReal,	
		i;

	while ( halfSize < bufferSize ) {
		phaseShiftStepReal = cosTable[halfSize];
		phaseShiftStepImag = sinTable[halfSize];
		currentPhaseShiftReal = 1.0;
		currentPhaseShiftImag = 0.0;

		for ( var fftStep = 0; fftStep < halfSize; fftStep++ ) {
			i = fftStep;

			while ( i < bufferSize ) {
				off = i + halfSize;
				tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
				ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

				real[off] = real[i] - tr;
				imag[off] = imag[i] - ti;
				real[i] += tr;
				imag[i] += ti;

				i += halfSize << 1;
			}

			tmpReal = currentPhaseShiftReal;
			currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
			currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
		}

		halfSize = halfSize << 1;
	}

	i = bufferSize/2;
	while(i--) {
		spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
	}
};