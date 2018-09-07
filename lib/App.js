// MIT License / Copyright 2015
"use strict";

const weave = require( '..' )
const garden = require( 'gardens' ).createScope( 'weave.App' )

const chalk = require( 'chalk' )
const { EventEmitter } = require( 'events' )
const path = require( 'path' )
const Spirit = require( 'string-spirits' )

weave.App = class App extends EventEmitter {
  constructor( options ) {
    // Make it an EventEmitter
    super()

    this.options = Object.assign( {
      urlCleaning: 'true',
      headers: { 'X-Powered-By': 'Weave' },
      indexes: {},
      extensions: [],
      mimeTypes: {},
      errorPages: {}
    }, options )

    this.mounts = {}
    this._mountPaths = {}
    this._resolvedPaths = {}
  }

  link( binding, hostname = '*' ) {
    // If host is a port number, it will handle the entire port.
    // If it is not a port number or a string, it is invalid.
    if ( typeof hostname !== 'string' ) return garden.typeerror( 'Hostname must be a string.' )

    // If the host is already taken, abandon ship.
    if ( binding.attachments[ hostname ] ) return garden.error( `${hostname}:${binding.port} already in use!` )

    // If the host is a wildcard then clear all wildcardMatches that match
    // it. If it's a literal, clear wildcardMatches for that literal.
    if ( /\*/.test( hostname ) ) {
      let wildcard = new Spirit( hostname )
      Object.keys( binding.cachedMatches ).forEach( cachedhost => {
        if ( wildcard.match( binding.cachedMatches[ cachedhost ] ) )
          binding.cachedMatches[ cachedhost ] = null })
    } else if ( binding.cachedMatches[ hostname ] )
      binding.cachedMatches[ hostname ] = null

    binding.attachments[ hostname ] = this

    if ( binding._active ) this.emit( 'ready', { binding, hostname } )
    else binding.server.on( 'listening', () => this.emit( 'ready', { binding, hostname } ))

    // Return this from all configuration methods so they can be chained.
    return this
  }

  mount( directory, app ) {
    if ( typeof directory !== 'string' ) return garden.typeerror( 'Argument directory must be a string!' )
    if ( !path.isAbsolute( directory ) ) return garden.error( 'Argument directory must be absolute!' )
    if ( directory.length < 2 ) return garden.error( 'Root is not a subdirectory!' )

    if ( !(app instanceof weave.App) ) return garden.typeerror( 'You can only mount apps!' )

    // Clear the cache so that the configuration can be modified and
    // not conflict with previously caches requests.
    this._mountsPaths = {}

    // Keep things consistent on Windows with other platforms.
    // Make sure that we don't store an ending slash on directories.
    // If /abc/ is configured, and /abc is requested, we should round up.
    directory = directory.replace( /\\/g, '/' ).replace( /\/$/, '' )

    // Check to make sure that the given directory does not overlap with any
    // current mounts. If it is, we should ask the user to nest the mounts.
    let overlap = Object.keys( this.mounts ).some( mount => {
      if ( mount.startsWith( directory ) || directory.startsWith( mount ) ) return mount
    })
    if ( overlap ) return garden.error( `Mounting in "${directory}" would cause overlap with the existing mount "${overlap}". Nesting should be used instead.` )

    // Inherit options from the parent app, and mount it
    app.options._super = this.options
    this.mounts[ directory ] = app

    // Return this from all configuration methods so they can be chained.
    return this
  }

  intercept( directory, handle ) {
    // Keep things consistent on Windows with other platforms.
    // Make sure that we don't store an ending slash on directories.
    // If /abc/ is configured, and /abc is requested, we should round up.
    directory = directory.replace( /\\/g, '/' ).replace( /\/$/, '' )

    // If there is already an interface at this path, we might be able to
    // attach to a different request method. If not, create a new wrapper.
    if ( !this.mounts[ directory ] ) this.mounts[ directory ] = { type: 'intercept' }

    // Check to make sure that the given directory does not overlap with any
    // current mounts. If it is, we should ask the user to nest the mounts.
    let overlap = Object.keys( this.mounts ).some( mount => {
      if ( mount !== directory && ( mount.startsWith( directory ) || directory.startsWith( mount ) ) ) {
        garden.error( `Mounting in "${directory}" would cause overlap with the existing mount "${overlap}". Nesting should be used instead.` )
        return true
      }
    })

    // Mount the intercept
    if ( typeof handle === 'function' ) {
      this.mounts[ directory ].default = handle
    } else {
      Object.assign( this.mounts[ directory ], handle )
    }

    // Return this from all configuration methods so they can be chained.
    return this
  }
}

void function ( ...methods ) {
  methods.forEach( method => {
    weave.App.prototype[ method ] = function ( path, handle ) {
      this.intercept( path, { [ method ]: handle } )
    }
  })
}( 'get', 'post', 'head', 'put', 'delete' )