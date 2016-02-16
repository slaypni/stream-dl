(function() {
  var casper, filedir, filename, fs, host, hosts, path, settings, system, utils;

  casper = require('casper').create();

  utils = require('utils');

  system = require('system');

  path = require('path');

  fs = require('fs');

  filename = fs.absolute(system.args[3]);

  filedir = (filename.split(fs.separator)).slice(0, -1).join(fs.separator);

  settings = require("" + filedir + fs.separator + "settings.json");

  hosts = casper.cli.args;

  if (hosts.length === 0) {
    return JSON.stringify({
      'err': 'No host specified'
    });
  }

  host = casper.cli.args[0];

  casper.options = {
    'pageSettings': {
      'userAgent': settings.userAgent,
      'javascriptEnabled': true,
      'loadPlugins': false
    },
    'viewportSize': {
      'width': 800,
      'height': 600
    }
  };

  casper.on('resource.received', function(resource) {
    var m;
    if (!(resource.stage === 'end' && resource.bodySize > 0)) {
      return;
    }
    m = resource.url.match(/.+\.(m3u|m3u8)(\?.*)?$/);
    if (m) {
      this.echo(JSON.stringify({
        'type': m[1],
        'url': resource.url
      }));
      this.removeListener('resource.received', arguments.callee);
      return this.exit();
    }
  });

  casper.start(host);

  casper.run(function() {
    return this.wait(Infinity);
  });

}).call(this);
