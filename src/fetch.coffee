utils = require 'utils'

settings = require './settings.json'

casper = require('casper').create()

hosts = casper.cli.args
return JSON.stringify {'err': 'No host specified'} if hosts.length == 0
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
