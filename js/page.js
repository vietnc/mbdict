(function() {
	window.Page = function( title, word, lang, isCompletePage ) {
		var lead = {};
		var sections = [];
		var lastCollapsibleSection = {subSections: []};
                this.id = word.id;
		this.title = title;
                this.content = word.content;
		this.lead = word.content;
		this.sections = word.sections;
		this.lang = lang;
		this.isCompletePage = isCompletePage;
                return this;
	};

	Page.deserializeFrom = function( data ) {
		var page = new Page( data.title, {}, data.lang, true);
		page.lead = data.lead;
		page.sections = data.sections;
		return page;
	}
        Page.getPage = function(title, lang) {
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
                var d = $.Deferred();
            db.transaction(function(tx){
                tx.executeSql(" SELECT id, title,content FROM words WHERE title = ?",[title],function(tx,rs){
                    var w = Object;
                    if(typeof rs.rows.length === 'undefined' || rs.rows.length === 0){
                        w = {title:'Not Found',content:'not found'};
                        page = new Page('-1',w,lang,true);
                        id = -1;
                    }else{
                        w =rs.rows.item(0);
                        id = rs.rows.item(0).id;
                    }
                    //show section 
                    if(id === -1){
                        suggestCond = " title like '"+title.substr(0,title.strlen -1) +"%' limit 6";
                    }else{
                        suggestCond = " id >= "+ id +"-3  limit 6";
                    }
                    tx.executeSql(" SELECT id, title FROM words WHERE "+ suggestCond,[],function( tx, rs){
                        extWords = [];
                        for(i=0;i<rs.rows.length; i++){
                            extWords.push({'title':rs.rows.item(i).title,'link':app.urlForTitle(rs.rows.item(i).title, 'en')});//lang vietnc temp
                        }
                        w.sections = [{'references':extWords}];
                        page = new Page(title,w,lang,true);
                        app.setCurrentPage(page);
                    },function(e){alert(e.message)});
                    },
                function(e){DbReader.onError(e.message);}); 
            },function(e){DbReader.onError(e.message);});
                
        }
	Page.requestFromTitle = function(title, lang, isCompletePage) {
		var sections;
		if( !isCompletePage ) {
			sections = "0|references";
		} else {
			sections = "all";
		}
		// Make sure changes to this are also propogated to getAPIUrl
                //vietnc
                //http://tratu.soha.vn/dispatchaddon.php?dict=en_vn&title=A&type=json
             
                        d= app.makeAPIRequest({
                                action: 'mobileview',
                                title: title, 
                                lang: lang,
                                sections: sections,
                                noheadings: 'yes'
                        }, lang ='en', {
                                dataFilter: function(data) {
                                        //p =  new Page( title, data , lang='en', isCompletePage );
                                        return data;
                                }
                        });	
                    
                    return d;
	};

	Page.prototype.requestCompletePage = function() {
		if( this.completePageReq ) {
			// Only one request should be sent
			return this.completePageReq;
		}

		var sectionsList = [];
		var that = this;
		this.completePageReq = app.makeAPIRequest({
			action: 'mobileview',
			page: this.title,
			redirects: 'yes',
			prop: 'sections|text',
			sections: sectionsList.join( '|' ),
			sectionprop: 'level|line',
			noheadings: 'yes'
		}, this.lang, {
			dataFilter: function(text) {
                                var data = JSON.parse( text );
				var newPage = new Page( that.title, data, that.lang, true );
				$.each( newPage.sections, function( index, section ) {
					if( section.id !== 0 || typeof section.references !== 'undefined' ) {
						// FIXME: *Rare* race condition when a new section is added
						// bwetween the first request and second request. Will cause the new
						// section to not show up (if added at the bottom) or replace other 
						// sections' content (if in the middle). Not a big enough concern for
						// now, but needs a fix eventually.
						that.sections[ index ] = section;
					}
				});
				that.isCompletePage = true;
				return that;
			}
		}).always( function() {
			that.completePageReq = null;;
		});
		return this.completePageReq;
	}

	Page.prototype.requestLangLinks = function() {
		if(this.langLinks) {
			var d = $.Deferred();
			d.resolve(this.langLinks);
			return d;
		}
		var that = this;
		return app.makeAPIRequest({
			action: 'parse',
			page: this.title,
			prop: 'langlinks'
		}, this.lang, {
			dataFilter: function(text) {
				var data = JSON.parse(text);
				var langLinks = [];
				$.each(data.parse.langlinks, function(i, langLink) {
					langLinks.push({lang: langLink.lang, title: langLink['*']});
				});
				that.langLinks = langLinks;
				return langLinks;
			}
		});
	};


	Page.prototype.getSection = function( id ) {
		var foundSection = null;
		$.each( this.sections, function( i, section ) {
			if( section.id == id ) {
				foundSection = section;
				return;
			}
		});
		return foundSection;
	}

	Page.prototype.requestSectionHtml = function( id ) {
		var d = $.Deferred();
		var sectionTemplate = templates.getTemplate( 'section-template' );
		console.log( 'fullpage is ' + this.isCompletePage );
		if( this.isCompletePage ) {
			d.resolve( sectionTemplate.render( this.getSection( id ) ) );
		} else {
			this.requestCompletePage().done( function( page ) {
				d.resolve( sectionTemplate.render( page.getSection( id ) ) );
			});
		}
		return d;
	};

	Page.prototype.toHtml = function() {
		var contentTemplate = templates.getTemplate('content-template');
		return contentTemplate.render(this);
	};

	Page.prototype.serialize = function() {
		// Be more specific later on, but for now this does :)
		return JSON.stringify(this);
	};

	Page.prototype.getHistoryUrl = function() {
		// This is uncaught by our intent filters, so will go directly to browser
		return app.baseUrlForLanguage(this.lang) + "&title=" + encodeURIComponent(this.title.replace(/ /g, '_')) + "&action=history";
	}

	Page.prototype.getCanonicalUrl = function() {
		return app.baseUrlForLanguage(this.lang) + "&title=" + encodeURIComponent(this.title.replace(/ /g, '_'));
	}

	// Returns an API URL that makes a request that retreives this page
	// Should mimic params from Page.requestFromTitle
	Page.prototype.getAPIUrl = function() {
		return app.baseUrlForLanguage(this.lang) + 'type=json&title=' + encodeURIComponent(this.title) + '&redirects=1&prop=sections|text&sections=all&sectionprop=level|line&noheadings=true';
	};

	Page.prototype.getCanonicalUrl = function() {
		return app.makeCanonicalUrl(this.lang, this.title);
	};

})();
