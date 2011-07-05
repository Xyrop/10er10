$(document).ready(function() {

var library = function () {
	var that=this;
	var ui=$('#library');

	ui.delegate("div.song",'dragstart', d10.dnd.onDragDefault)
		.delegate("div.song",'dragend',d10.dnd.removeDragItem)
		.delegate("div.song","dblclick",function(e) {
			d10.playlist.append($(this).clone());
		})
		.delegate("div.song","click",function(e) {
			var target = $(e.target);
			if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
				$(this).toggleClass("selected");
	});

	this.init_topic = function (topic,category) {
// 		debug("init_topic start");

		//
		// create topic div + controls (if any)
		//
		var topicdiv = $('div[name='+topic+']',ui);
		if ( topicdiv.length == 0 ) {
			topicdiv=$('<div name="'+topic+'"></div>');
			that.init_controls(topic,topicdiv);
			ui.append(topicdiv);
		}
		
		if ( topic == "genres" && !category ) { category = "<all>"; }

		//
		//if category is specified select it
		//
		if ( category ) {
			that.selectTopicCategory(topic,category,topicdiv);
		} else {
			category = getSelectedTopicCategory (topic, topicdiv );
		}

		//
		// launch the topic category display
		//

		//
		// get id
		//
		var id = that.get_id(topic,topicdiv,category);
		//
		// get topic category container
		//
		var categorydiv=$('div[name="'+id+'"]',topicdiv);
		if ( !categorydiv.length ) {
			if ( topic == "genres" && category == "<all>" ) {
				categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.control.genre")+"</div>");
			} else if ( topic == "genres" ) {
// 				var eGenre = escape(category);
				categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.content.genre")+"</div>");
				categorydiv.find("article h2 > span:first-child").text(category);
				categorydiv.find("article h2 > .link").click(function() { window.location.hash = "#/library/genres"; });
				bindControls(categorydiv, topic, category);
			} else {
				categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.content.simple")+"</div>");
				bindControls(categorydiv, topic, category);
			}
			topicdiv.append(categorydiv);
		}
		
		// special pages
		if ( topic == "artists" && category == "<all>" ) {
			debug("special category case");
			allArtists(categorydiv);
		} else if ( topic == "genres" && category == "<all>" ) {
			displayGenres(categorydiv);
		} else {
			// create the infiniteScroll
			var section = categorydiv.find("section");
			if ( !section.data("infiniteScroll") ) {
				createInfiniteScroll(categorydiv, topic, category);
			}
		}
		//
		// show current topic category if not already visible
		//
		if ( topicdiv.data('activeCategory') != id ) {
			$('div.topic_category',topicdiv).hide();
			categorydiv.show();
			topicdiv.data('activeCategory',id);
		}

	} 

	var displayGenres = function(categorydiv) {
		var cacheNotExpired = d10.localcache.getJSON("genres.index");
		if ( cacheNotExpired ) { 
		}
		
		d10.bghttp.get({
			url: site_url+"/api/genresResume",
			dataType: "json",
			success: function(response) {
				d10.localcache.setJSON("genres.index", {"f":"b"},true);
				var content = "";
				$.each(response.data,function(k,v) { //{"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}
					var artists = "";
					$.each(v.value.artists,function(foo,artist) {
						artists+=d10.mustacheView("library.listing.genre.line", {"artist": artist})
					});
					content+=d10.mustacheView("library.listing.genre", {"genre": v.key[0],"count": v.value.count},  {"artists": artists});
				});
				categorydiv.find("div.genresLanding").html(content);
				categorydiv.find("div.pleaseWait").hide();
				categorydiv.find("div.genresLanding")
				.show()
				.delegate("span.artistName","click",function() {
					location.hash = "#/library/artists/"+encodeURIComponent($(this).text());
				})
				.delegate("div.genre > span","click",function() {
					location.hash = "#/library/genres/"+encodeURIComponent($(this).text());
				})
				.delegate("span.all","click",function() {
					var genre = $(this).closest("div.genre").children("span").text();
					location.hash = "#/library/genres/"+encodeURIComponent(genre);
				});
			}
		});
	};

	var bindControls = function(categorydiv, topic, category) {
		categorydiv.find(".pushAll").click(function() {
			d10.playlist.append(categorydiv.find(".song").clone().removeClass("selected"));
		});
		categorydiv.find(".refresh").click(function() {
			categorydiv.find(".song").remove();
			var is = categorydiv.find("section").data("infiniteScroll");
			if ( is && "remove" in is ) {
				is.remove();
			}
			createInfiniteScroll(categorydiv, topic, category);
		});
	};
	
	var createInfiniteScroll = function(categorydiv, topic, category) {
		var section = categorydiv.find("section");
		var url = "/api/list/"+topic;
		var data = {};
		if ( topic == "genres" ) {
			data.genre = category;
		} else if ( topic == "albums" ) {
			data.album = category ? category : "";
		} else if ( topic == "artists" ) {
			data.artist = category ? category : "";
		} else if ( topic == "titles" ) {
			data.title = category ? category : "";
		} else if ( topic != "creations" && topic != "hits" ) {
			return false;
		}
		var loadTimeout = null, 
			innerLoading = categorydiv.find(".innerLoading");
		section.data("infiniteScroll",
			section.infiniteScroll(
				url,
				data,
				section.find(".list"),
				{
					onFirstContent: function(length) {
						categorydiv.find(".pleaseWait").remove();
						categorydiv.find(".songlist").removeClass("hidden");
						if ( !length ) {
							categorydiv.find("article").hide();
							categorydiv.find(".noResult").removeClass("hidden");
							return ;
						}
						
						var list = categorydiv.find(".list");
						// list of items < section height
						if ( list.height() < section.height() )  {
							section.height(list.height()+10);
							section.next(".grippie").hide();
						} else {
							section.next(".grippie").show();
							section.makeResizable(
								{
									vertical: true,
									minHeight: 100,
									maxHeight: function() {
										// always the scrollHeight
										var sh = list.prop("scrollHeight");
										if ( sh ) {
											return sh -10;
										}
										return 0;
									},
									grippie: $(categorydiv).find(".grippie")
								}
														);
						}
						
						if ( d10.library.extendedInfos[topic] ) {
							d10.library.extendedInfos[topic](category,categorydiv);
						}
						
					},
					onQuery: function() {
						loadTimeout = setTimeout(function() {
							loadTimeout = null;
							debug("Loading...");
							innerLoading.css("top", section.height() - 32).removeClass("hidden");
						},500);
					},
					onContent: function() {
						if ( loadTimeout ) {
							clearTimeout(loadTimeout);
						} else {
							innerLoading.addClass("hidden");
						}
					}
				}
			)
		);
	};
	

	var allArtists = function (container) {
		var cacheNotExpired = d10.localcache.getJSON("artists.allartists");
		if ( cacheNotExpired ) { return ; }
		d10.localcache.setJSON("artists.allartists", {"f":"b"},true);
		container.empty();
		d10.bghttp.get({
			"url": site_url+"/api/artistsListing",
			"dataType": "json",
			"success": function(data) {
				displayAllArtists(container,data);
			}
		});
	};

	var displayAllArtists = function (container, data) {
     debug("displayAllArtists",container,data);
		data = data.data;
		var letter = '';
		var letter_container = null;
		for ( var index in data.rows ) {
			var artist = data.rows[index].key.pop();
			var songs = data.rows[index].value;
			var current_letter = artist.substring(0,1);
			if ( current_letter != letter ) {
				if ( letter_container ) container.append(letter_container);
				letter = current_letter;
				letter_container = $( d10.mustacheView("library.listing.artist", {"letter": letter}) );
			}
			$(">div",letter_container).append( d10.mustacheView("library.listing.artist.line", {"artist": artist, "songs": songs}) );
		}
		if ( letter_container ) { container.append( letter_container ); }

		$("span.link",container).click(function() {
			window.location.hash = "#/library/artists/"+encodeURIComponent($(this).text());
		});
	};

	this.init_controls = function (topic,catdiv) {
		if ( topic == 'artists' ) {      
			catdiv.append( d10.mustacheView('library.control.artist') );
			var widget = $("input[name=artist]",catdiv);
			$("span[name=all]",catdiv).click(function(){ widget.val('').trigger('blur'); window.location.hash = "#/library/artists/"+encodeURIComponent("<all>"); });
			$('img[name=clear]',catdiv).click(function() { widget.val('').trigger('blur');window.location.hash = "#/library/"+topic+"/"; });
			widget.val(widget.attr('defaultvalue'))
			.permanentOvlay(site_url+'/api/artist', $(".overlay",catdiv),{
				"autocss": true,
				"minlength" : 1 ,
				"select": function (data, json) {
					window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(json);
					return json;
				},
				"beforeLoad": function() {
					this.getOverlay().width(widget.width());
				},
			});
		} else if ( topic == 'albums' ) {
			catdiv.append( d10.mustacheView('library.control.album') );
			var widget = $('input[name=album]',catdiv);
			widget.val(widget.attr('defaultvalue'))
			.permanentOvlay(site_url+'/api/album', $(".overlay",catdiv),
					{
						"varname": "start", 
						"minlength" : 1 ,
						"autocss": true,
						"select": function (data, json) {
							window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(data);
							return data;
						}
					}
			);
			$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); window.location.hash = "#/library/"+topic+"/"; });
			
		} else if ( topic == 'titles' ) {
			catdiv.append( d10.mustacheView('library.control.title') );
			var widget = $('input[name=title]',catdiv);
			widget.val(widget.attr('defaultvalue'))
			.permanentOvlay(site_url+'/api/title', $(".overlay",catdiv), 
				{
					"autocss": true,
					"varname": 'start', 
					"minlength" : 1 ,
					"select": function (data, json) {
						window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(data);
						return data;
					}
				}
			);
			$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); window.location.hash = "#/library/"+topic+"/"; });
		}
		return catdiv;
	}

	this.get_id = function (topic,catdiv,category) {
		var id=topic;
		category = category || '';
		if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
			id='_'+ escape(category) ;
		}
		return id;
	}

	this.selectTopicCategory = function (topic,category,topicdiv) {
		if ( topic == 'artists' && category != '<all>' ) {
			$('input[name=artist]',topicdiv).val(category);
		} else if ( topic == 'albums' ) {
			$('input[name=album]',topicdiv).val(category);
		} else if ( topic == 'titles' ) {
			$('input[name=title]',topicdiv).val(category);
		}
		return topicdiv;
	}

	var getSelectedTopicCategory = function (topic, topicdiv ) {
		if ( topic == 'artists' ) {
			var widget = $('input[name=artist]',topicdiv);
			if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
			return widget.val();
		} else if ( topic == 'albums' ) {
			var widget = $('input[name=album]',topicdiv);
			if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
			return widget.val();
		} else if ( topic == 'titles' ) {
			var widget = $('input[name=title]',topicdiv);
			if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
			return widget.val();
		}
		return null;
	}

	var mm = this.router = new d10.fn.menuManager ({
		'menu': $('>nav',ui),
		'container': ui,
		'active_class': 'active',
		'property': 'name',
		'effects': false,
		"routePrepend":["library"],
		"useRouteAPI": true
	});

	mm.bind("subroute", function (e,data) {
		var cat = data.segments.length ? data.segments[0] : "";
		that.init_topic(data.label,cat);
	});

	$(document).bind("route.library",function(e,data) {
		var routes = ["artists", "albums", "genres", "titles","creations", "hits"];
		if ( !data.segments.length ||  routes.indexOf(data.segments[0]) < 0 ) { 
			if ( !mm.current_label() ) {
				mm.route( ["creations"], data.env );
			}
			return ;
		}
		mm.route( data.segments, data.env );
	});

};

d10.library = new library();
delete library;

});

$(document).ready(function() {
	
	var when = function (elems, then) {
		var responses = {}, errors = {},
			count = function(obj) {
				var count = 0;
				for ( var k in obj ) {count++;}
				return count;
			},
			elemsCount = count(elems),
			checkEOT = function() {
				var errCount = count(errors), respCount = count(responses);
				if ( respCount + errCount == elemsCount ) {
					if ( errCount ) { then.call(this,errors, responses); } 
					else { then.call(this,null,responses); }
				}
			};
		
		for ( var k in elems) {
			(function(callback, key){
				callback.call(this,function(err,response) {
					if( err ) {	errors[key] = err; }
					else		{ responses[key] = response;}
					checkEOT();
				});
			})(elems[k],k);
		}
		return {
			active: function() {  return (elems.length - responses.length - errors.length ); },
			total: function() { return elems.length},
			complete: function() { return (responses.length + errors.length); },
			completeNames: function() {
				var back = [];
				for ( var index in responses ) { back.push(index); }
				for ( var index in errors ) { back.push(index); }
				return back;
			}
		};
	};
	
	
	
	
	d10.library.extendedInfos = {
		genres: function(genre, topicdiv) {
			var hide = topicdiv.find("span.hide");
			var show = topicdiv.find("span.show");
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = $(d10.mustacheView("library.content.extended.2parts", {
				part1title: "Artists",
				part1class: "artists",
				part2title: "Albums",
				part2class: "albums",
			}));
			if ( d10.config.library && d10.config.library.hideExtendedInfos ) {
				hide.hide();
				topicdiv.find(".extendedInfosContainer").hide();
			} else {
				show.hide();
			}
			infos.hide();
			when({
				artists: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/genres/artists/"+genre,
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push($("<li />").html(resp.data[i].key[1]).attr("data-name",resp.data[i].key[1]));
							}
							then(null,back);
						},
						error: function(err) {
							then(err);
						}
					});
				},
				albums: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/genres/albums/"+genre,
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push($("<li />").html(resp.data[i].key[1]+" ("+resp.data[i].value+" songs)").attr("data-name",resp.data[i].key[1]));
							}
							then(null,back);
						},
						error: function(err) {
							then(err);
						}
					});
				}
			},
			function(errs,responses) {
				if ( responses.artists.length ) {
					var artists = infos.find("ul.artists");
					$.each(responses.artists,function(i,v) { artists.append(v); });
				}
				if ( responses.albums.length ) {
					var albums= infos.find("ul.albums");
					$.each(responses.albums,function(i,v) { albums.append(v); });
				}
				topicdiv.find(".showHide .hide").click(function() {
					d10.config.library = d10.config.library || {};
					d10.config.library.hideExtendedInfos = true;
					topicdiv.find(".extendedInfosContainer").slideUp("fast");
					$(this).slideUp("fast",function() {
						$(this).siblings(".show").slideDown("fast");
					});
				});
				topicdiv.find(".showHide .show").click(function() {
					d10.config.library = d10.config.library || {};
					d10.config.library.hideExtendedInfos = false;
					topicdiv.find(".extendedInfosContainer").slideDown("fast");
					$(this).slideUp("fast",function() {
						$(this).siblings(".hide").slideDown("fast");
					});
				});
				topicdiv.find(".extendedInfos").append(infos);
				if ( loading.is(":visible") ) {
					loading.slideUp("fast",function() {loading.remove();});
				} else {
					loading.remove();
				}
				infos.slideDown("fast");
			});
			infos.find("ul.artists").delegate("li","click",function() {
				location.hash = "#/library/artists/"+encodeURIComponent($(this).attr("data-name"));
			});
			infos.find("ul.albums").delegate("li","click",function() {
				location.hash = "#/library/albums/"+encodeURIComponent($(this).attr("data-name"));
			});
		},
		artists: function(artist,topicdiv) {
			if ( !artist || !artist.length ) {
				topicdiv.find(".showHideExtended").remove();
				topicdiv.find(".extendedInfosContainer").remove();
				return ;
			}
			var show = topicdiv.find(".show");
			var hide = topicdiv.find(".hide");
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = $(d10.mustacheView("library.content.extended.2parts", {
				part1title: "Related artists",
				part1class: "artists",
				part2title: "Albums",
				part2class: "albums",
			}));
			show.hide();
			infos.hide();
			when({
				artists: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/relatedArtists/"+artist,
						dataType: "json",
						success: function(resp) {
// 							debug(resp);
// 							var ul = infos.find("ul.artists");
							var back = [];
							for ( var i in resp.data.artistsRelated ) {
								back.push( $("<li />").html(resp.data.artistsRelated[i]).attr("data-name",resp.data.artistsRelated[i]) );
							}
							then(null,back);
						},
						error: function(err) {
							then(err);
						}
					});
				}/*,
				albums: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/genres/albums/"+genre,
						dataType: "json",
						success: function(resp) {
// 							debug(resp);
							var ul = infos.find("ul.albums");
							for ( var i in resp.data ) {
								var li = $("<li />").html(resp.data[i].key[1]+" ("+resp.data[i].value+" songs)").attr("data-name",resp.data[i].key[1]);
								ul.append(li);
							}
							then(null);
						},
						error: function(err) {
							then(err);
						}
					});
				}*/
			},
			function(errs,responses) {
				if ( responses.artists.length ) {
					var artists = infos.find("ul.artists");
					$.each(responses.artists,function(i,v) { artists.append(v); });
				}
				topicdiv.find(".showHide .hide").click(function() {
					d10.config.library = d10.config.library || {};
					d10.config.library.hideExtendedInfos = true;
					topicdiv.find(".extendedInfosContainer").slideUp("fast");
					$(this).slideUp("fast",function() {
						$(this).siblings(".show").slideDown("fast");
					});
				});
				topicdiv.find(".showHide .show").click(function() {
					d10.config.library = d10.config.library || {};
					d10.config.library.hideExtendedInfos = false;
					topicdiv.find(".extendedInfosContainer").slideDown("fast");
					$(this).slideUp("fast",function() {
						$(this).siblings(".hide").slideDown("fast");
					});
				});
				topicdiv.find(".extendedInfos").append(infos);
				if ( loading.is(":visible") ) {
					loading.slideUp("fast",function() {loading.remove();});
				} else {
					loading.remove();
				}
				infos.slideDown("fast");
			});
			infos.find("ul.artists").delegate("li","click",function() {
				location.hash = "#/library/artists/"+encodeURIComponent($(this).attr("data-name"));
			});
			infos.find("ul.albums").delegate("li","click",function() {
				location.hash = "#/library/albums/"+encodeURIComponent($(this).attr("data-name"));
			});
			show.click(function() {
				show.hide();
				hide.show();
				topicdiv.find(".extendedInfos").show();
			});
			hide.click(function() {
				show.show();
				hide.hide();
				topicdiv.find(".extendedInfos").hide();
			});
		}
	};
});
