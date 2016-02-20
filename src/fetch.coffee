casper = require('casper').create()

utils = require 'utils'
system = require 'system'
path = require 'path'
fs = require 'fs'

filename = fs.absolute system.args[3]
filedir = (filename.split fs.separator)[...-1].join fs.separator

settings = require "#{filedir}#{fs.separator}settings.json"

hosts = casper.cli.args
if hosts.length == 0
  casper.echo JSON.stringify {'err': 'No host specified'}
  casper.exit()
  return
host = casper.cli.args[0]

casper.options =
  'pageSettings':
    'userAgent': settings.userAgent
    'javascriptEnabled': true
    'loadPlugins': false
  'viewportSize':
    'width': 800
    'height': 600

casper.on 'resource.received', (resource) ->
  return if not(resource.stage == 'end' and resource.bodySize > 0)
  m = resource.url.match /.+\.(m3u|m3u8)(\?.*)?$/
  if m
    @echo JSON.stringify
      'type': m[1]
      'url': resource.url
    @removeListener 'resource.received', arguments.callee
    @exit()

casper.start host

casper.run ->
  @wait Infinity
