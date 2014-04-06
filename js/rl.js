window.rl = function() {
	var cssCache = {};
	function requestSiteCSS( lang ) {
		var css = cssCache[ lang ];
		if( typeof css === 'undefined' ) {
			var url = app.resourceLoaderURL( lang );
			var params = {
				debug: false,
				lang: lang,
				modules: 'mobile.site',
				only: 'styles',
				skin: 'mobile'
			};
			return $.get( url, params );
		} else {
			var d = $.Deferred();
			return d.resolve( css );
		}
	}

	return {
		requestSiteCSS: requestSiteCSS
	}
}();
