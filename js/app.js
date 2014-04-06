window.app = function() {

	var wikis = null;

	function getWikiMetadata() {
		var d = $.Deferred();
		if( wikis === null ) {
			$.ajax({
				url: ROOT_URL + 'wikis.json',
				dataType: 'json'
			}).done(function(data) {
				wikis = data;
				d.resolve(wikis);
			});
		} else {
			d.resolve(wikis);
		}
		return d;
	}
	function showRandom(){
		DbReader.random()
                .done(function(page) {
                    app.setCurrentPage(page);
		});
	}
	function loadMainPage(lang) { 
		var d = $.Deferred();
		if(typeof lang === "undefined") {
			lang = preferencesDB.get("language");
		}

		app.getWikiMetadata().done(function(wikis) {
                    //loadLocalPage('error.html');
                    loadLocalPage('home.html');
			var mainPage = wikis[lang].mainPage;
                        //get online data
			app.navigateTo( mainPage, lang, { isCompletePage: true } ).done( function( data ) {
				d.resolve(data);
			}).fail(function(err) {
				d.reject(err);
			});
                        
		});
		return d;
	}

	function loadCachedPage( url, title, lang ) {
		// Overriden by platform specific implementations;
	}

	function setCurrentPage(page) {
		app.curPage = page;
		chrome.renderHtml(page);

		setPageActionsState(true);
		setMenuItemState('read-in', true);
		chrome.setupScrolling("#content");
		chrome.scrollTo("#content", 0);
		appHistory.addCurrentPage();
		chrome.toggleMoveActions();
		geo.addShowNearbyLinks();
		$("#page-footer").show();
                chrome.showContent();
                //vietnc add
                $(".sectionItem").click(onSectionRefClick);
		chrome.hideSpinner();
	}
        function setExtPage(words) {
		chrome.loadExtPage(words);                	
	}
	function setErrorPage(type) {
		if(type == 404) {
			loadLocalPage('404.html');
		} else {
			loadLocalPage('error.html');
		}
		setMenuItemState('read-in', false);
		setPageActionsState(false);
		chrome.hideSpinner();
		$("#page-footer").hide();
		app.curPage = null;
	}

	function loadPage( title, language, isCompletePage ) {
		var d = $.Deferred();

		function doRequest() {
			var req = Page.requestFromTitle( title, language, isCompletePage );
                       
                                req.done( function( page ) {
                              if(page === null || typeof page === 'undefined') {
					setErrorPage(404);
				}
                                page = new Page( title,page, lang='en', isCompletePage );
				setCurrentPage(page);
				if( !page.isCompletePage ) {
					page.requestCompletePage().done( function() {
						console.log("Full page retreived!");
					});
				}
				d.resolve(page);
			}).fail(function(xhr, textStatus, errorThrown) {
                		if(textStatus === "abort") {
					// User cancelled action. Do nothing!
					console.log("User cancelled action!");
					return;
				}
				setErrorPage(xhr.status);	
				d.reject(xhr);
			});
			chrome.setSpinningReq(req);
		}

		doRequest();
		return d;
	}

	function loadLocalPage(page) {
		var d = $.Deferred();
		$('base').attr('href', ROOT_URL);
		$('#main').load(page, function() {
			$('#main').localize();
			d.resolve();
		});
		return d;
	}
        //vietnc
        function onSectionRefClick() {
		var parent = $(this).parents();
		var url = parent.data("page-url");
		app.navigateToPage(url);
	}
	function urlForTitle(title, lang) {
		if(typeof lang === 'undefined') {
			lang = preferencesDB.get("language");
		}
		return app.baseUrlForLanguage(lang) + "&title=" + encodeURIComponent(title.replace(/ /g, '_'));
	}

	function resourceLoaderURL( lang ) {
		// Path to the ResourceLoader load.php to be used for loading site-specific css
		return "http://bits.wikimedia.org/" + lang + ".wikipedia.org/load.php"
	}

	function baseUrlForLanguage(lang) {
                //vietnc http://tratu.soha.vn/dispatchaddon.php?dict=en_vn&title=A&type=json
                if(lang === 'en')lang = 'en_vn';
                else lang = 'vn_en';
                return ROOT_URL + "?dict="+lang ;// "http://tratu.soha.vn/dispatchaddon.php?dict="
		//return window.PROTOCOL + '://' + lang + '.' + PROJECTNAME + '.org';
	}

	function makeCanonicalUrl(lang, title) {
		return baseUrlForLanguage(lang) + '&title=' + encodeURIComponent(title.replace(/ /g, '_'));
	}

	function setContentLanguage(language) {
		preferencesDB.set('language', language);
		app.baseURL = app.baseUrlForLanguage(language);
	}

	function setFontSize(size) {
		preferencesDB.set('fontSize', size);
		$('#main').css('font-size', size);
	}

	var curTheme = null;
	function setTheme( name ) {
		var url = ROOT_URL + 'themes/' + name + '.less.css';
		if( name == curTheme ) {
			return;
		}
		$.get( url ).done( function( data ) {
			chrome.loadCSS( 'theme-style', data );
			$( 'body' ).removeClass( 'theme-' + curTheme ).addClass( 'theme-' + name );
			curTheme = name;
			preferencesDB.set( 'theme', name );
		} );
	}

	function navigateTo(title, lang, options) {
		var d = $.Deferred();
		var options = $.extend( {cache: true, updateHistory: true, isCompletePage: false}, options || {} );
		var url = app.urlForTitle(title, lang);

		if(title === "") {
			return app.loadMainPage(lang);
		}

		$('#searchParam').val('');
		chrome.showContent();
		if(options.hideCurrent) {
			$("#content").hide();
		}
		chrome.showSpinner();

		if (options.updateHistory) {
			currentHistoryIndex += 1;
			pageHistory[currentHistoryIndex] = url;
		}
		if(title === "") {
			title = "Home"; // FIXME
		}
                /*
		d = app.loadPage( title, lang, options.isCompletePage );
		d.done(function(page) {
            		if(options.hideCurrent) {
				$("#content").show();
				// see http://forrst.com/posts/iOS_scrolling_issue_solved-rgX
				// Fix for bug causing page to not scroll in iOS 5.x when visited from nearby
				chrome.scrollTo("#content", 0);
			}			
		});
                */
                d = search.performSearch(title, 1);
                d.done(function(page) {
            		if(options.hideCurrent) {
				$("#content").show();
				// see http://forrst.com/posts/iOS_scrolling_issue_solved-rgX
				// Fix for bug causing page to not scroll in iOS 5.x when visited from nearby
				chrome.scrollTo("#content", 0);
			}			
		});
		return d;
	}

	function navigateToPage(url, options) {
		var title = app.titleForUrl(url);
		var lang = app.languageForUrl(url);
                return Page.getPage(title, lang); //vietnc
                
		//return app.navigateTo(title, lang, options);
	}

	function getCurrentUrl() {
		if(app.curPage) {
			return app.curPage.getCanonicalUrl();
		} else {
			return null;
		}
	}

	function languageForUrl(url) {
            // Use the least significant part of the hostname as language
            // So en.wikipedia.org would be 'en', and so would en.wiktionary.org
            var re = new RegExp( "dict=(.*)&", "g" );
            return re.exec(url)[1];

	}

	function titleForUrl(url) {
		var re = new RegExp( "title=(.*)", "g" );
                
                unescaped = decodeURIComponent(url),
                title = unescaped.replace(/_/g, ' ');
                title= re.exec(title)[1];
		return title;
	}
	function getCurrentTitle() {
		if(app.curPage) {
			return app.curPage.title;
		} else {
			return null;
		}
	}

	function makeAPIRequest(params, lang, extraOptions) {
		params = params || {};
		params.format = 'json'; // Force JSON
                
                params.type = params.format;
		lang = lang || preferencesDB.get('language');
		var url = app.baseUrlForLanguage(lang);
		var defaultOptions = {
			url: url,
			data: params,
			// Making this 'text' and parsing the JSON ourselves makes things much easier
			// Than making it as 'JSON' for pre-processing via dataFilter
			// See https://forum.jquery.com/topic/datafilter-function-and-json-string-result-problems
			dataType: 'json'
		};
		var options = $.extend(defaultOptions, extraOptions);
		return $.ajax(options);
	}

	function track(eventId) {
		makeAPIRequest({
			eventid: eventId,
			namespacenumber: 0,
			token: '+/', // Anonymous token
			additional: 'android' // System info
		}, preferencesDB.get('language'));
	}
	var exports = {
                showRandom:showRandom,
		setFontSize: setFontSize,
		setTheme: setTheme,
		setContentLanguage: setContentLanguage,
		navigateToPage: navigateToPage,
		getCurrentUrl: getCurrentUrl,
		getCurrentTitle: getCurrentTitle,
		urlForTitle: urlForTitle,
		titleForUrl:titleForUrl,
		languageForUrl: languageForUrl,
		baseUrlForLanguage: baseUrlForLanguage,
		resourceLoaderURL: resourceLoaderURL,
		loadPage: loadPage,
		loadCachedPage: loadCachedPage, 
		makeCanonicalUrl: makeCanonicalUrl,
		makeAPIRequest: makeAPIRequest,
		setCurrentPage: setCurrentPage,
		track: track,
		curPage: null,
		navigateTo: navigateTo,
		getWikiMetadata: getWikiMetadata,
		loadMainPage: loadMainPage
	};

	return exports;
}();
