var expect = require( "expect.js" );
var sinon = require( "sinon" );
expect = require( "sinon-expect" ).enhance( expect, sinon, "was" );

var sql = require( "../../src/index.js" );

describe( "Seriate Mocks", function() {
	describe( "when adding a mock", function() {
		describe( "when mock is a function", function() {
			var expectedResult = [
				{ name: "brian", paramVal: "foo", superpower: "lightning from fingertips" },
				{ name: "alex", paramVal: "foo", superpower: "gaseous anomalies" },
				{ name: "jim", paramVal: "foo", superpower: "drives doug crazy" },
				{ name: "doug", paramVal: "foo", superpower: "the human linter" },
				{ name: "gunny", paramVal: "foo", superpower: "kung fu" }
			];
			beforeEach( function() {
				sql.addMock( "guise", function( stepAction ) {
					return [
						{ name: "brian", paramVal: stepAction.params.testval, superpower: "lightning from fingertips" },
						{ name: "alex", paramVal: stepAction.params.testval, superpower: "gaseous anomalies" },
						{ name: "jim", paramVal: stepAction.params.testval, superpower: "drives doug crazy" },
						{ name: "doug", paramVal: stepAction.params.testval, superpower: "the human linter" },
						{ name: "gunny", paramVal: stepAction.params.testval, superpower: "kung fu" }
					];
				} );
			} );
			it( "should produce correct mock results", function() {
				//sql.execute();
			} );
		} );
		describe( "when mock is an array of static records", function() {
			var expectedResult = [
				{ name: "brian", superpower: "lightning from fingertips" },
				{ name: "alex", superpower: "gaseous anomalies" },
				{ name: "jim", superpower: "drives doug crazy" },
				{ name: "doug", superpower: "the human linter" },
				{ name: "gunny", superpower: "kung fu" }
			];
			beforeEach( function() {
				sql.addMock( "guise", [
					{ name: "brian", superpower: "lightning from fingertips" },
					{ name: "alex", superpower: "gaseous anomalies" },
					{ name: "jim", superpower: "drives doug crazy" },
					{ name: "doug", superpower: "the human linter" },
					{ name: "gunny", superpower: "kung fu" }
				] );
			} );
			it( "should produce correct mock results", function() {} );
		} );
	} );
	describe( "when removing a mock", function() {
		describe( "when specifying a mock key", function() {
			it( "should remove the mock" );
		} );
		describe( "when not passing any keys", function() {
			it( "should remove all mocks" );
		} );
	} );
} );
