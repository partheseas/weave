/* MIT License
   Created by partheseas (Tyler Washburn)
   Copyright Tyler Washburn 2014 */

var Wildcard;

module.exports = exports = Wildcard = function ( string ) {
  if ( /^[A-Za-z0-9\*\[\]\.\_\-\:]+$/.test( string ) ) {
  	this.expression = RegExp( "^" +
  		string
  		  .replace( /([\.\[\]])/g, "\\$1" ) // Make sure that special charaters are escaped before creating the expression
  		  .replace( /\*/g, ".+" ) // Turn * wildcards into . wildcards
  	+  "$" )
  	this.string = string
  }
}

Wildcard.prototype.match = function ( string ) {
  return this.expression.exec( string )
}

Wildcard.match = function ( wildcard, string ) {
  return new Wildcard( wildcard ).test( string )
}

Wildcard.bestMatch = function ( wildcards, string ) {
  var match;

  match = ""

  wildcards.forEach( function ( wildcard ) {
    if ( ( new Wildcard( wildcard ) ).match( string ) ) {
    	if ( wildcard.length > match.length ) {
    		match = wildcard
    	}
    }
  } )

  return match
}