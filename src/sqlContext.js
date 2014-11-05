var _ = require( "lodash" );
var when = require( "when" );
var mocks = require("./mocks");
var machina;
var sql;
var Monologue;

function errorHandler( err ) {
	this.err = err;
	this.transition( "error" );
}

function mockedSql( options, mock ) {
	return when.promise( function( resolve, reject ) {
		var fulfiller = mock.isError ? reject : resolve;
		setTimeout( function(){
			console.log("-----------------")
			console.log(mock)
			console.log("-----------------")
			fulfiller( mock.mockResults( options ) );
		}, mock.waitTime || 0 );
	});
}

function nonPreparedSql( options ) {
	var req = new sql.Request( this.transaction || this.connection );
	_.each( options.params, function( val, key ) {
		if ( typeof val === "object" ) {
			req.input( key, val.type, val.val );
		} else {
			req.input( key, val );
		}
	} );
	var operation = options.query ? "query" : "execute";
	var sqlCmd = options.query || options.procedure;
	return when.promise( function( resolve, reject ) {
		req[ operation ]( sqlCmd, function( err, result ) {
			if ( err ) {
				reject( err );
			} else {
				resolve( result );
			}
		} );
	} );
}

function preparedSql( options ) {
	var cmd = new sql.PreparedStatement( this.transaction || this.connection );
	var paramKeyValues = {};
	_.each( options.params, function( val, key ) {
		if ( typeof val === "object" ) {
			cmd.input( key, val.type );
			paramKeyValues[ key ] = val.val;
		} else {
			cmd.input( key );
			paramKeyValues[ key ] = val;
		}
	} );
	return when.promise( function( resolve, reject ) {
		cmd.prepare( options.preparedSql, function( err ) {
			if ( err ) {
				reject( err );
			}
			cmd.execute( paramKeyValues, function( err, result ) {
				if ( err ) {
					reject( err );
				}
				cmd.unprepare( function( err ) {
					if ( err ) {
						reject( err );
					} else {
						resolve( result );
					}
				} );
			} );
		} );
	} );
}

function mockedViaFileName( options ) {
	var mockedQuery = ( options.query && options.query.mockResults ) ? options.query : undefined;
	var mockedProc  = ( options.procedure && options.procedure.mockResults ) ? options.procedure : undefined;
	var mockedPrep  = ( options.preparedSql && options.preparedSql.mockResults ) ? options.preparedSql : undefined;
	return  mockedQuery || mockedProc || mockedPrep;
}

function mockedViaKeyOrStatement( options, step ) {
	var stepMock = mocks.getMock( step );
	var queryMock = mocks.getMock( options.query );
	var procMock = mocks.getMock( options.procedure );
	var prepMock = mocks.getMock( options.preparedSql );
	return stepMock || queryMock || procMock || prepMock;
}

function hasMock( options, step ) {
	return mockedViaFileName( options ) || mockedViaKeyOrStatement( options );
}

function executeSql( options ) {
	var mock = hasMock( options, this.state );
	if(mock) {
		return mockedSql( options, mock );
	} else if ( options.query || options.procedure ) {
		return nonPreparedSql.call( this, options );
	} else {
		return preparedSql.call( this, options );
	}
}

function addState( fsm, name, stepAction ) {
	if ( fsm.states[ name ] ) {
		throw new Error( "A step by that name already exists" );
	}

	fsm.pipeline.push( name );

	fsm.states[ name ] = {
		_onEnter: function() {
			var exec = function( options ) {
				executeSql.call( fsm, options )
					.then( fsm.handle.bind( fsm, "success" ) )
					.then( null, fsm.handle.bind( fsm, "error" ) );
			}.bind( fsm );
			stepAction.call(
				fsm,
				exec,
				fsm.results
			);
		},
		success: function( result ) {
			fsm.results[ name ] = result;
			fsm.emit( "data", result );
			fsm.nextState();
		},
		error: errorHandler
	};
}

module.exports = function( mssql, MonologueCtor, mach ) {
	sql = mssql;
	Monologue = MonologueCtor;
	machina = mach;

	var SqlContext = machina.Fsm.extend( {

		initialState: "uninitialized",

		initialize: function( options ) {
			this.connectionCfg = options.connectionCfg;
			this.results = {};
			this.pipeline = [];
			this.pipePos = -1;
		},

		nextState: function() {
			this.pipePos += 1;
			var nextState = this.pipeline[ this.pipePos ] || "done";
			this.transition( nextState );
		},

		states: {
			uninitialized: {
				"start": "connecting"
			},

			connecting: {
				_onEnter: function() {
					this.connection = new sql.Connection( this.connectionCfg, function( err ) {
						if ( err ) {
							this.handle( "error", err );
						} else {
							this.handle( "success" );
						}
					}.bind( this ) );
				},
				success: function() {
					this.nextState();
				},
				error: function( err ) {
					this.err = err;
					this.transition( "error" );
				}
			},

			done: {
				_onEnter: function() {
					if ( this.connection.close ) {
						this.connection.close();
					}
					this.emit( "end", this.results );
				},
				error: function( err ) {
					this.err = err;
					this.transition( "error" );
				}
			},

			error: {
				_onEnter: function() {
					if ( this.connection.close ) {
						this.connection.close();
					}
					this.err.message = "Seriate SqlContext Error. Failed on step '" + this.priorState + "'." + this.err.message;
					this.emit( "error", this.err );
				}
			}
		},

		step: function( alias, stepAction ) {
			var opt;
			if ( typeof stepAction === "object" ) {
				opt = stepAction;
				stepAction = function( execute ) {
					return execute( opt );
				};
			}
			addState( this, alias, stepAction );
			return this;
		},

		end: function( fn ) {
			this.on( "end", fn );
			if ( !this._started ) {
				process.nextTick( function() {
					this.handle( "start" );
				}.bind( this ) );
				this._started = true;
			}
			return this;
		},

		error: function( fn ) {
			this.on( "error", fn );
			if ( !this._started ) {
				process.nextTick( function() {
					this.handle( "start" );
				}.bind( this ) );
				this._started = true;
			}
			return this;
		},

		abort: function() {
			this.handle( "error", "Operation aborted" );
		}

	} );

	Monologue.mixInto( SqlContext );

	return SqlContext;
};
