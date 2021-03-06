define(["js/domReady","js/d10.playlistModule", "js/playlist", "js/user", "js/d10.events"], function(foo, playlistModule, playlist, user, pubsub) {


	var module = new playlistModule("fade",{},{});
	var uiTimeout = null;
	var ui = $("#container div.fading");
    
    var getAudioFade = function() {
      var af = user.get_preferences().audioFade;
      if ( isNaN(af) || af < 0 ) {
        return 15;
      }
      return af;
    };
    
    var updateAudioFadeDisplay = function() {
      var audioFade = getAudioFade();
      debug("getAudioFade: ",audioFade);
      ui.find("input").val( audioFade );
      ui.find("span.fadeValue").html( audioFade );
    };
    
    pubsub.topic('user.infos').subscribe(updateAudioFadeDisplay);
    updateAudioFadeDisplay ();



	ui.find("input").bind("input",function() {
		var input = $(this);
// 		debug("audioFade input : "+input.val());
		var fade = parseInt(input.val(),10);
		if ( isNaN(fade) ) {
			return ;
		}
		debug("setting audioFade to ",fade);
        if ( uiTimeout ) {
          clearTimeout(uiTimeout);
        }
        uiTimeout = setTimeout(function() {
          user.set_preference("audioFade",fade);
          uiTimeout = null;
        },2000);
		ui.find("span.fadeValue").html( fade );
	});
	playlist.modules[module.name] = module;
	return module;
});




