DbReader = window.DbReader = {
        
        drop: function(){
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
            db.transaction(function(tx){
                tx.executeSql('DROP TABLE words');
            })
        },
        onError: function(e) {
            console.log("There has been an error: " + e);
            return false;
          },
        add: function(word) {
        var db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
        db.transaction(function(tx){
          tx.executeSql("INSERT INTO words(title, content,speech, voice, meta) VALUES (?,?,?,?,?)",
              [word.title, word.content,word.speech,word.voice,"{added_on:"+new Date()+"}"],
              function(){console.log('added word'+ word.title)},
              onError);
         });
        },
        insertData: function (){
            var url = ROOT_URL + 'dat.sql',
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
            DbReader.drop();
            console.log('Loading sql: ' + url);
            db.transaction(function(tx){
                tx.executeSql("CREATE TABLE IF NOT EXISTS words(\n\
                    id INTEGER PRIMARY KEY AUTOINCREMENT,\n\
                    title TEXT ,\n\
                    content TEXT,\n\
                    speech TEXT, \n\
                    voice ,\n\
                    meta TEXT)"); 
            })
            $.ajax({
                    url: url,
                    //async: false, // fails on WinPhone7.1
                    dataType: 'text',
                    contentType: "text/plain; charset=UTF-8",
                    success: function(data,tx) {
                            console.log('success loading sql' + url);
                            try {
                                    var     lines = data.split(/;\r?\n/),
                                            blank = /^\s*$/;
                                     db.transaction(function(tx){
                                      
                                        for (var i = 0; i < lines.length; i++) {
                                                var line = lines[i];
                                                if (line.match(blank)) {
                                                        continue;
                                                }
                                                line = line.split("\n").join('<br/>');
                                               
                                                    tx.executeSql(line,[],function(){console.log('inserted:'+line); }, function(err){
                                                        console.log("SQL error: "+err.message + err.code);
                                                    
                                                    }) 
                                               
                                                
                                        }
                                      });
                                    console.log('insert SQLlite ' + lines.length);
                                    db.transaction(function (tx) {
                                        
                                        tx.executeSql('SELECT count(1) as total FROM words', [], function (tx, results) {
                                         var len = results.rows.length, i;
                                         msg =  "<p>Found rows: " + len + "</p>";
                                         for (i = 0; i < len; i++){
                                           msg += "<p><b>" + results.rows.item(i).total + "</b></p>";
                                         };
                                         console.log(msg);
                                       }, null);
                                    })
                            } catch (e) {
                                    // We have no messages for this particular language code
                                    alert('Parse Err:'+ e);
                                    return;
                            }
                    }
            });
        },
	search: function(text, n) {
            var d = $.Deferred();
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
            db.transaction(function(tx){
                if(typeof n === 'undefined') n = 1;
                n = 10*n;
                tx.executeSql(" SELECT title,content FROM words WHERE title like '"+text+"%' limit "+n+ ",10",[],function(tx,rs){
                    d.resolve(rs);
                    //console.log( rs.rows.item(0));
                    //return rs.rows.item(0);
                    },
                function(e){DbReader.onError(e.message);}); 
            },function(e){DbReader.onError(e.message);});
            return d.promise();		
	},
        get: function(text,dict) {
            var d = $.Deferred();
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
            db.transaction(function(tx){
                tx.executeSql(" SELECT title,content FROM words WHERE title = ?",[text],function(tx,rs){
                    //console.log( rs.rows.item(0));
                    p =  new Page( text,  rs.rows.item(0), lang='en', isCompletePage=true );
                    return d.resolve();
                    },
                function(e){DbReader.onError(e.message);}); 
            },function(e){DbReader.onError(e.message);});
            return d.promise();		
	},
        random: function() { //dict
            var d = $.Deferred();
            db = window.openDatabase("TratuDb", "1.0", "Vietnc", 1000000);
            db.transaction(function(tx){
                tx.executeSql(" SELECT title FROM words ",[],function(tx,rs){
                    console.log(rs.rows.length);
                    index = Math.floor(Math.random()*(rs.rows.length) + 1);
                    Page.getPage(rs.rows.item(index).title, lang='en');
                    },
                function(e){DbReader.onError(e);}); 
            },function(e){DbReader.onError(e);});
            return d.promise();		
	},
	unescape: function(str) {
		// @fixme add \u escapes -- won't be used in our files though
		str = str.replace(/\\n/g, "\n");
		str = str.replace(/\\t/g, "\t");
		str = str.replace(/\\(.)/g, "$1");
		return str;
	}
};

