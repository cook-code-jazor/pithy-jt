/*!
pithy.teemplate.js
teemplate, not template
javascript template parse engine;
by anlige @ 2017-07-23
*/

;(function(crc32){
	var global_setting = {
		trim_start : true,
		escape : true,
		cache : true
	};
	var blank_chars = {'\r' : true, '\n' : true, '\t' : true, ' ' : true};
	var newline_chars = {'\r' : true, '\n' : true};
	var empty_chars = {'\t' : true, ' ' : true};
	var quoto_chars = {'"' : true, '\'' : true};
	
	var PAIRS = {')' : '(', '}' : '{', ']' : '['};
	var PAIRS2 = {'(' : ')', '{' : '}', '[' : ']'};

	
	var push = Array.prototype.push;
	var shift = Array.prototype.shift;
	var slice = Array.prototype.slice;
	var toString = Object.prototype.toString;
	var chr = '';
	var VARIABLE_NAME = '__con__';

	
	//map something
	var token_chars = '0123456789qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM_';
	var token_chars_map = {};
	var operate_chars = '+-*/%\\^|&!.?|=:~ <>,';
	var operate_chars_map = {};

	for(var i=0; i< token_chars.length; i++){
		chr = token_chars.substr(i, 1);
		token_chars_map[chr] = true;
	}
	for(var i=0; i< operate_chars.length; i++){
		chr = operate_chars.substr(i, 1);
		operate_chars_map[chr] = true;
	}
	
	function scanline(content, callback){
		if(!content || typeof content != 'string'){
			return;
		}
		var _callback = function(start, end, words, line_num, emptys){
			if(start == end){
				return;
			}
			var last = end - 1;
			while(last >= start){
				if(empty_chars[words[last]]){
					last--;
				}else{
					break;
				}
			}
			callback(start, last + 1, words, line_num, emptys);
		};
		var words = content.split('');
		var length = words.length;
		var lenth2 = length - 1;
		var index = 0;

		var chr = '';
		var line = '';
		var start = 0;
		var newline = true; 
		var line_num = 0;
		var emptys = '';
		while(true){
			chr = words[index];
			if(	newline_chars[chr]){
				newline = true;
				line_num++;
				_callback(start, index, words, line_num, emptys);
				start = index + 1;
				emptys = '';
				
				if(chr == '\r'){
					if(index < length - 1 && words[index + 1] == '\n'){
						index++;
						start = index + 1;
					}
				}
			}else if(newline && empty_chars[chr]){
				emptys += chr;
				start++;
				
			}else{
				newline = false;
				
			}
			index++;
			
			if(index >= length){
				line_num++;
				_callback(start, index, words, line_num, emptys);
				break;
			}
		}
	}
	var TOKEN = {
		IF : 'if',
		FOR : 'for',
		FOREACH : 'foreach',
		EACH : 'each',
		SWITCH : 'switch',
		WHILE : 'while',
		NORMAL : 'normal',
		CODE : 'code',
		HTML : 'html',
		LINE : 'line',
		REGION : 'region',
		ENDREGION : 'endregion',
		COMMENT : 'comment',
		HTMLEND : 'htmlend'
	};
	function next_token(token_type, words){
		var token = '',
			chr = '',
			start = token_type.start,
			end = token_type.end;
		
		while(start < end){
			chr = words[start];
			if(empty_chars[chr] && token == ''){
				start++;
				continue;
			}
			if(chr == ':'){
				token_type.start = start + 1;
				token_type.type = TOKEN.LINE;
				return;
			}
			if(chr == '{'){
				token_type.start = start;
				token_type.type = TOKEN.CODE;
				return;
			}
			if(!token_chars_map[chr]){
				break;
			}
			token += words[start];
			start++;
		}
		switch(token){
			case 'if' :
			case 'for' :
			case 'switch' :
			case 'while' :
			case 'foreach' :
			case 'each' :
			case 'region' :
			case 'endregion' :
				token_type.start = start;
				token_type.type = token;
				break;
		}
	}
	function token(start, end, words){
		var chr = words[start];
		var token_type = {
			start : start,
			end : end,
			type : '',
			html_tag : ''
		};
		if(chr == '<'){
			token_type.type = TOKEN.HTML;
			var next = start + 1;
			while(next < end){
				chr = words[next];
				if(chr == '/'){
					token_type.type = TOKEN.HTMLEND;
					next++;
					start++;
					continue;
				}
				if(!token_chars_map[chr]){
					break;
				}
				next++;
			}
			if(next > start + 1){
				token_type.html_tag = words.slice(start + 1, next).join('')
			}
		}
		else if(chr == '@'){
			if(start + 1 == end){
				throw 'syntax error \'' + words.slice(start, end).join('') + '\'';
			}
			token_type.start++;
			if(words[token_type.start] == '*'){
				token_type.start++;
				token_type.type = TOKEN.COMMENT;
				return token_type;
			};
			
			//in fact, it can be simplized
			next_token(token_type, words);
			if(token_type.type == ''){
				//throw 'error on line : ' + words.slice(start, end).join('');
				token_type.type = TOKEN.LINE;
				token_type.start = start;
			}
		}else{
			token_type.type = TOKEN.NORMAL;
		}
		return token_type;
	}

	function line(start, end, words){
		if(start == end){
			return [];
		}

		var length = end, 
			index = start, 
			token = '', 
			chr = '',
			result = [], 
			part = '', 
			part_end = 0,
			variable_expression = '', 
			escape = global_setting.escape;
		
		while(true){
			if(index== length){
				break;
			}
			chr = words[index];
			if(chr == '@'){
				if(index < length - 1 && words[index + 1] == '@'){
					part += '@';
					index += 2;
					continue;
				}
				if(index == length - 1){
					part += '@';
					break;
				}
				part_end = check_syntax(index + 1, words.length, words, []);
				if(part_end > index + 1){
					result.push(VARIABLE_NAME + ' += "' + part.replace(/"/g, '\\"') + '";');
					variable_expression = words.slice(index + 1, part_end).join('');
					index = part_end - 1;
					part = '';
					result.push(VARIABLE_NAME + ' += ' + (escape ? 'Html.escape(' : '') + variable_expression + (escape ? ')' : '') + ';');
				}else{
					part += '@';
				}
			}else{
				part += chr;
			}
			index++;
		}
		if(part){
			result.push(VARIABLE_NAME + ' += "' + part.replace(/"/g, '\\"') + '";');
		}
		return result;
	}
	
	
	function check_syntax(start, end, words, levels, verify){
		var chr = '',
			quote = false,
			stop = false,
			_start = start,
			expect,
			quote_char = '';
		
		verify = verify === true;
		var first_chr = '';
		while(true){
			if(start >= end){
				break;
			}
			chr = words[start];
			if(!first_chr && chr == '('){
				first_chr = chr;
			}
			if(quoto_chars[chr]){
				if(levels.length == 0){
					break;
				}
				if(!quote){
					quote = true;
					_start = start;
					quote_char = chr;
				}else if(quote && words[start - 1] != '\\' && quote_char == chr){
					quote = false;
				}
				start++;
				continue;
			}
			if(quote || chr == '.'){
				start++;
				continue;
			}
			if(PAIRS2[chr]){
				levels.push(chr);
				start++;
				continue;
			}

			if(PAIRS[chr]){
				if(levels.length == 0){
					break;
				}
				if(levels[levels.length -1] != PAIRS[chr]){
					expect = PAIRS2[levels[levels.length -1]];
					throw 'unexpected symbol "' + chr + '"' + (expect ? ', expect "' + PAIRS2[levels[levels.length -1]] + '"' : '') ;
				}
				levels.pop();
				if(!verify){
					if(levels.length ==0 && PAIRS[chr] === first_chr){
						return ++start;
					}
				}
				start++;
				continue;
			}
			if(!verify && operate_chars_map[chr]){
				if(levels.length == 0 ){
					break;
				}
				start++;
				continue;
			}
			if(!verify && !token_chars_map[chr]){
				break;
			}
			
			start++;
		}
		if(quote){
			throw 'quote_char (' + quote_char + ') missing';
		}
		if(!verify && levels.length !=0){
			throw '"' + PAIRS2[levels[levels.length - 1]] + '" missing';
		}
		return start;
	}
	var __raw = function(text){
		this.text = text;
	}
	var helper = {
		escape :function(src){
			var is_raw = src instanceof __raw;
			if(is_raw){
				src = src.text;
			}
			if(src === undefined || src === null){
				return '';
			}
			src = src + '';
			if(!src){
				return '';
			}
			if(is_raw){
				return src;
			}
			return src
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		},
		raw : function(src){
			if(global_setting['escape'] !== true){
				return src;
			}
			return new __raw(src);
		}
	};

	//compile mutile-string line into one line
	function filter_result(lines){
		var last_is_string = false,
			length = lines.length,
			line = '',
			result = [], 
			last_line = '';
		
		for(var i = 0; i < length; i++){
			line = lines[i];
			if(line.length > VARIABLE_NAME.length + 7 
			&& line.substr(line.length - 2) == '";' 
			&& line.substr(0, VARIABLE_NAME.length + 5) == VARIABLE_NAME + ' += "'){
				if(!last_is_string){
					last_is_string = true;
					result.push(line);
				}else{
					last_line = result[result.length - 1];
					last_line = last_line.substr(0, last_line.length - 2);
					last_line = last_line + line.substr(VARIABLE_NAME.length + 5);
					result[result.length - 1] = last_line;
				}
			}else{
				last_is_string = false;
				result.push(line);
			}
		}
		return result;
	}

	function parse_foreach(line, type, __LINE__){
		var parts = /^(?:\s*)(.+?)(?:\s*)as(?:\s*)(?:([^\s]+?)(?:(?:\s*),(?:\s*)([^\s]+?))?)(?:\s*)\{$/.exec(line);
		if(!parts){
			throw 'syntax error for \'foreach\' statement';
		}
		var variable_name = parts[1];
		var key =  parts[2];
		var value =  parts[3];
		if(!value){
			value = key;
			key = '__key_' + __LINE__;
		}
		var lines = [];
		if(type == TOKEN.EACH){
			lines.push('for(var ' + key + ' = 0; ' + key + ' < ' + variable_name + '.length; ' + key + '++){');
		}else{
			lines.push('for(var ' + key + ' in ' + variable_name + '){');
			lines.push('if(!' + variable_name + '.hasOwnProperty(' + key + ')) continue;');
		}
		lines.push('var ' + value + ' = ' + variable_name + '[' + key + '];');
		return lines.join('\n');
	}

	function end_script(linetext, ends){
		var ends_length = ends.length;
		return linetext.length >= ends_length && linetext.substr(linetext.length - ends_length) == ends;
	}

	var __CACHE__ = {};
	var __SUBSCRIBERS = {};

	function publish(token, words, line_num, fullline){
		if(!__SUBSCRIBERS[token.type]){
			return;
		}

		var users = __SUBSCRIBERS[token.type];
		var i = 0, length = users.length;
		var result = '';
		for(var i = length - 1; i >= 0; i--){
			users[i](token, words, line_num, fullline);
		}
	}
	
	function __initlize(){
	}
	__initlize.subscribe = function(token, callback){
		if(typeof callback != 'function'){
			throw 'Exception : subscribe failed. callback must be a function';
		}
		var users = __SUBSCRIBERS[token] || (__SUBSCRIBERS[token] = []);
		
		users.push(callback);
		
	};
	
	__initlize.unsubscribe = function(token, callback){
		if(callback && typeof callback != 'function'){
			throw 'Exception : unsubscribe failed. callback must be a function';
		}
		if(!__SUBSCRIBERS[token]){
			return;
		}
		if(!callback){
			__SUBSCRIBERS[token] = null;
			return;
		}
		var users = __SUBSCRIBERS[token];
		var i = 0, length = users.length;
		for(var i = length - 1; i >= 0; i--){
			if(users[i] != callback){
				continue;
			}
			users.splice(i, 1);
		}
		
	};
	
	__initlize.compile = function(content){
		var _crc32 = '';
		if(global_setting.cache === true){
			_crc32 = crc32(content);
			if(__CACHE__.hasOwnProperty(_crc32)){
				return __CACHE__[_crc32];
			}
		}
		
		var result = [];
		var __LINE__ =  0;
		result.push('var ' + VARIABLE_NAME + ' = \'\';');

		content = content.replace(/^([\r\n]+)/, '');
		
		var CODE_LEVELS = [];
		
		function exception(e, start, fullline){
			return 'Exception : ' + e + '\nLine: ' + __LINE__ + '\nCode: ' + fullline;
		}
		var trim_start = global_setting.trim_start,

			last_code_line = '',
			last_line_num = 0,
			last_line_start = 0,
			_region = false;

		
		scanline(content, function(start, end, words, line_num, emptys){
			__LINE__ = line_num;
			var _token = null;
			var fullline = content.slice(start, end);
			try{
				_token = token(start, end, words);
			}catch(e){
				throw exception(e, start, fullline);
			}
			var linetext = null;
			publish(_token, words, __LINE__, fullline);
			if(_token.linetext === undefined){
				linetext = content.slice(_token.start, _token.end);
			}else{
				linetext = _token.linetext;
			}
			switch(_token.type){
				case TOKEN.COMMENT:
					break;
				case TOKEN.REGION : 
					_region = true;
					break;
				case TOKEN.ENDREGION : 
					_region = false;
					break;	
				case TOKEN.FOREACH : 
				case TOKEN.EACH : 
					try{
						linetext = parse_foreach(linetext, _token.type, __LINE__);
					}catch(e){
						if(typeof e == 'string'){
							throw exception(e, start, fullline);
						}
						throw e;
					}
					_token.type = '';
				
				case TOKEN.IF : 
				case TOKEN.FOR : 
				case TOKEN.SWITCH : 
				case TOKEN.WHILE : 
					linetext = _token.type + linetext;
				case TOKEN.NORMAL : 
				case TOKEN.CODE : 
					if(!_region){
						try{
							//simple syntax parse
							check_syntax(_token.start, _token.end, words, CODE_LEVELS , true);
						}catch(e){
							if(typeof e == 'string'){
								throw exception(e, start, fullline);
							}
							throw e;
						}
						last_code_line = fullline;
						last_line_num = line_num;
						last_line_start = start;
						result.push(linetext);
						break;
					}
				
				case TOKEN.HTML : 
				case TOKEN.HTMLEND : 
				case TOKEN.LINE : 
					try{
						if(!trim_start && emptys){
							result.push(VARIABLE_NAME + ' += "' + emptys + '";');
						}
						push.apply(result, line(_token.start, _token.end, words));
						result.push(VARIABLE_NAME + ' += "\\n";');
					}catch(e){
						if(typeof e == 'string'){
							throw exception(e, start, fullline);
						}
						throw e;
					}
					break;
			}
		});
		
		//syntax parse result
		if(CODE_LEVELS.length != 0){
			__LINE__ = last_line_num;
			throw exception('"' + PAIRS2[CODE_LEVELS[CODE_LEVELS.length - 1]] + '" missing', last_line_start, last_code_line);
		}
		
		result.push('return ' + VARIABLE_NAME + ';');
		result = filter_result(result);
		var code = result.join('\r\n');

		if(global_setting.cache === true){
			__CACHE__[_crc32] = code;
		}
		return code;
	};

	var global_objects = {};
	__initlize.render = function(content, data){
		if(!data || toString.call(data) != '[object Object]'){
			throw 'Exception : data is invalid. it must be an objected-type.';
		}
		
		var keys = [];
		var values = [];
		for(var key in data){
			if(!data.hasOwnProperty(key)){
				continue;
			}
			keys.push(key);
			values.push(data[key]);
		}
		keys.push('Html');
		values.push(helper);
		for(var key in global_objects){
			if(!global_objects.hasOwnProperty(key)){
				continue;
			}
			keys.push(key);
			values.push(global_objects[key]);
		}
		var wapper = new Function(keys, content);
		return wapper.apply(null, values);
	};
	
	helper.typeOf = __initlize.typeOf = function(ele){
		return toString.call(ele);
	};
	
	__initlize.register = function(name, func){
		helper[name] = function(){
			var result = func.apply(helper, arguments);
			if(global_setting['escape'] !== true){
				return result;
			}
			return new __raw(result);
		};
	};
	__initlize.registerObject = function(name, src){
		global_objects[name] = src;
	};
	
	__initlize.config = function(name, value){
		name == 'trim_start' && (global_setting[name] = value !== false);
		name == 'escape' && (global_setting[name] = value !== false);
		name == 'cache' && (global_setting[name] = value !== false);
	};

	__initlize.scanline = scanline;
	__initlize.token = token;
	__initlize.TOKEN = TOKEN;
	
	window.Pjt = __initlize;
})((function(){
	var Crc32Table=[], map_hex2 = [];
	function MakeTable()
	{
	    var i,j,crc;
	    for (i = 0; i < 256; i++)
	    {
	        crc = i;
	        for (j = 0; j < 8; j++)
	        {
	            if (crc & 1)
	                crc = (crc >>> 1) ^ 0xEDB88320;
	            else
	                crc >>>= 1;
	        }
	        Crc32Table[i] = crc;
	        map_hex2.push(('0' + i.toString(16)).slice(-2));
	    }
	}
	function __initlize(csData)
	{
		if(!csData){
			return '';
		}
	    var crc  = 0xffffffff, len = csData.length, i=0;
	    var chr = 0;
	    for(var i = 0; i < len; i++)
	    {
			chr = csData.charCodeAt(i);
			if(chr <= 0xff){
		    	crc = (crc >>> 8) ^ Crc32Table[(crc ^ chr) & 0xff ];
	    	}else{
		    	crc = (crc >>> 8) ^ Crc32Table[(crc ^ ((chr >>> 2) & 0xff)) & 0xff ];
		    	crc = (crc >>> 8) ^ Crc32Table[(crc ^ (chr & 0xff)) & 0xff ];
	    	}
	    }
	    return word2hex(crc ^ 0xffffffff);
	}
	function word2hex(word){
		return map_hex2[word>>>24] + 
		map_hex2[(word>>16) & 0xff] + 
		map_hex2[(word>>8) & 0xff] + 
		map_hex2[word & 0xff];
	}
	MakeTable();
	
	return __initlize;
})());