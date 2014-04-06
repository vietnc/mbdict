window.search = function() {
	var curReq = null; // Current search request
        var nClick = 1;
	function stopCurrentRequest() {
		if(curReq !== null) {
			curReq.fail();
			curReq = null;
		}
	}

	function handleNetworkFailure(err, xhr) {
		// We abort previous requests before making a new one
		// So we don't need to be showing error messages when the error is an abort
		if(err.statusText !== "abort") {
			chrome.popupErrorMessage(xhr);
			chrome.hideSpinner();
		}
	}

	function performSearch(term, isSuggestion, click) { 
            isSuggestion = false;//vietnc
            if(typeof click === 'undefined') click = 1;
            nClick = click;
		if(term == '') {
			chrome.showContent();
			return;
		}
		chrome.showSpinner();
		if(!isSuggestion) {
			return getFullTextSearchResults(term, click);
		} else {
			return getSearchResults(term);
		}
	}

	function getDidYouMeanResults(results) {
		// perform did you mean search
		stopCurrentRequest();
		curReq = app.makeAPIRequest({
			action: 'query',
			list: 'search',
			srsearch: results[0],
			srinfo: 'suggestion',
			format: 'json'
		}).done(function(data) {
			var suggestion_results = data;
			var suggestion = getSuggestionFromSuggestionResults(suggestion_results);
			if(suggestion) {
				getSearchResults(suggestion, 'true');
			}
		}).fail(handleNetworkFailure);
		chrome.setSpinningReq(curReq);
	}

	function getSuggestionFromSuggestionResults(suggestion_results) {
		if(typeof suggestion_results.query.searchinfo != 'undefined') {
			var suggestion = suggestion_results.query.searchinfo.suggestion;
			return suggestion;
		} else {
			return false;
		}
	}

	function getFullTextSearchResults(term, click) {
		stopCurrentRequest();
                //vietnc
                nClick = click;
                //extract info
                curReq = DbReader.search(term, click).done(function(rs){
                            var arrTitle = Array();
                            var arrContent = Array();
                            for(i=0;i<(rs.rows.length);i++){
                                arrTitle[i] = rs.rows.item(i).title;
                                arrContent[i] = rs.rows.item(i).content ;
                            }
                            renderResults([term, arrTitle,arrContent], false)
                        });
		chrome.setSpinningReq(curReq);
		return curReq;
	}
       
	function getSearchResults(term, didyoumean) {
		stopCurrentRequest();
		curReq = app.makeAPIRequest({
			action: 'opensearch',
			search: term
		}).done(function(data) {
			var results = data;
			if(results[1].length === 0) { 
				getDidYouMeanResults(results);
			} else {
				if(typeof didyoumean == 'undefined') {
					didyoumean = false;
				}
				renderResults(results, didyoumean);
			}
		}).fail(handleNetworkFailure);
		chrome.setSpinningReq(curReq);
		return curReq;
	}

	function onSearchResultClicked() {
		var parent = $(this).parents(".listItemContainer");
		var title = parent.data("page-title");
		$("#search").focus(); // Hides the keyboard
		//app.navigateToPage(url);
                //app.navigateTo('Foul-up', 'en') 
                Page.getPage(title, 'en')
		
	}

	function onDoFullSearch() {
                nClick  =nClick + 1;
		performSearch($("#searchParam").val(), false,nClick);
	}

	function renderResults(results, didyoumean) {
		var template = templates.getTemplate('search-results-template');
		if(results.length > 0) {
                       var searchParam = results[0];
                       var searchResults = results[1].map(function(title,i) {
                           //suggestion
				return {
					key: app.urlForTitle(title),
					title: title,
                                        content:results[2][i].replace(/(<([^>]+)>|@)/ig,"").substr(20,20)
				};
			});
			if(didyoumean) {
				var didyoumean_link = {
					key: app.urlForTitle(results[0]),
					title: results[0]
				};
				$("#resultList").html(template.render({'pages': searchResults, 'didyoumean': didyoumean_link}));
			} else {
				$("#resultList").html(template.render({'pages': searchResults}));
			}
			$("#resultList .searchItem").click(onSearchResultClicked);
		}
		$("#doFullSearch").click(onDoFullSearch);
		$("#resultList .searchItem").bind('touchstart', function() {
			$("#searchParam").blur();
		});
		chrome.hideSpinner();
		chrome.hideOverlays();
		$('#searchresults').localize().show();
		if(!chrome.isTwoColumnView()) {
			$("#content").hide(); // Not chrome.hideContent() since we want the header
		} else {
			$("html").addClass('overlay-open');
		}
		chrome.setupScrolling('#searchresults .scroller');
		// see http://forrst.com/posts/iOS_scrolling_issue_solved-rgX
		// Fix for bug causing page to not scroll in iOS 5.x when visited from nearby
		chrome.scrollTo("#searchresults .scroller", 0);
	}

	return {
		performSearch: performSearch
	};
}();

