var _ = require("lodash");
var mockCache = {};

/* Example mock object structure

	{
		mockResults: function() {
			return []; // array of mock rows
		},
		isError: true/false,
		waitTime: { milliseconds } to wait (defaults to 0)
	}

*/

module.exports = {
	addMock: function( key, mock ) {
		var realMock = mock;
		if( _.isFunction( realMock ) ) {
			realMock = {
				mockResults: mock,
				isError: false,
				waitTime: 0
			}
		} else if( _.isArray( realMock ) ) {
			realMock = {
				mockResults: function() {
					return mock;
				},
				isError: false,
				waitTime: 0
			}
		}
		mockCache[ key ] = realMock;
	},
	getMock: function(key) {
		// can't mock "result" key, since
		// that's the internal step name used
		// when calling execute/executeTransaction
		var mock = (key === "result") ? undefined : mockCache[key];
		if(mock) {
			console.info("Mock key found:", key);
		}
		return mock ? { mockResults: mock } : undefined;
	},
	clearMock: function( key ) {
		if ( arguments.length === 0 ) {
			mockCache = {};
		} else {
			if ( mockCache.hasOwnProperty( key ) ) {
				delete mockCache[ key ];
			}
		}
	},
	mockCache: mockCache
}
