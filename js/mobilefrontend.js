mw.mobileFrontend = (function() {
	return {
		init: function() {
		},
		registerModule: function( name, module ) {
			this[ name ] = module;
		},
		message: function(name) {
			return mw.message(name).plain();
		},
		history: {
			replaceHash: function( hash ) {
				// noop; Function used in toggle.js
			}
		},
		setting: function() {
		},
		supportsPositionFixed: function() {
			return true;
		},
		utils: jQuery,
		jQuery: jQuery
	}
})();
