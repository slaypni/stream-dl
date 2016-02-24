(function() {
  var _, argv, childProcess, dl, filedir, fs, getOutputFileName, hlsDownloader, hlsMasterIndexHandler, m3uHandler, main, os, path, settings, url, urls, util,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  util = require('util');

  path = require('path');

  fs = require('fs');

  childProcess = require('child_process');

  url = require('url');

  os = require('os');

  _ = require('lodash');

  filedir = path.dirname(fs.realpathSync(__filename));

  settings = require(path.join(filedir, 'settings.json'));

  argv = require('yargs').usage('Usage: stream-dl [options] <url>').nargs('o', 1).describe('o', 'Output file path').demand(1).help('h').alias('h', 'help').version(function() {
    return require(path.join(filedir, '..', 'package.json')).version;
  }).argv;

  urls = argv._;

  getOutputFileName = function(name, host, i) {
    var fnames;
    if (name == null) {
      name = _.last(host != null ? host.split('/') : void 0);
      name = name != null ? name.match(/(.+?)(\?.*)?$/)[1] : void 0;
      if (name == null) {
        return;
      }
    }
    if (i >= 1) {
      fnames = (path.basename(name)).split('.');
      fnames[0] += "-" + i;
      name = path.join(path.dirname(name), fnames.join('.'));
    }
    return name;
  };

  main = function() {
    var args, casperjs, cmd, exec, fetchjs, i, iurl, j, len, opath, results;
    results = [];
    for (i = j = 0, len = urls.length; j < len; i = ++j) {
      iurl = urls[i];
      opath = getOutputFileName(argv.o, iurl, i);
      if (opath == null) {
        console.error('Invalid output path');
        continue;
      }
      if (!iurl.match(/.+\.(m3u|m3u8)(\?.*)?$/)) {
        casperjs = path.join(filedir, '..', 'node_modules', '.bin', 'casperjs');
        fetchjs = path.join(filedir, 'fetch.js');
        args = ['--engine=slimerjs', fetchjs, iurl];
        cmd = [casperjs, args.join(' ')].join(' ');
        exec = os.platform() !== 'win32' ? childProcess.execFile.bind(void 0, 'casperjs', args) : childProcess.exec.bind(void 0, cmd);
        results.push(exec(function(err, stdout, stderr) {
          var iurl_, out, ref, type;
          out = _.last(stdout.trim().split('\n'));
          ref = JSON.parse(out), iurl_ = ref.url, type = ref.type;
          return dl(iurl_, opath, type);
        }));
      } else {
        results.push(dl(iurl, opath));
      }
    }
    return results;
  };

  m3uHandler = function(iurl, opath) {
    var args, extname;
    extname = path.extname(opath);
    if (extname === '.m3u' || extname === '.m3u8' || extname === '') {
      opath = (_.trimEnd(opath, extname)) + '.mp4';
    }
    console.log("Input URL: " + iurl);
    console.log("Output File: " + opath);
    args = [iurl];
    if (os.platform() === 'win32') {
      args = _.concat(['-k'], args);
    }
    return childProcess.execFile('curl', args, function(err, stdout, stderr) {
      var directives, entries, entry, field, fields, i, info, line, lines;
      lines = stdout.split('\n').map(function(line) {
        return line.trim();
      });
      if ('#EXTM3U' !== lines[0]) {
        return;
      }
      entries = (function() {
        var j, len, ref, results;
        results = [];
        for (i = j = 0, len = lines.length; j < len; i = ++j) {
          line = lines[i];
          ref = line.split(':'), info = ref[0], field = ref[1];
          if (!info.startsWith('#')) {
            continue;
          }
          entry = {
            'directive': info,
            'fields': field != null ? field.match(/([^,]*".*"|[^,]+)/g) : void 0
          };
          if (entry.fields != null) {
            fields = entry.fields.map(function(field) {
              return field.split('=');
            }).filter(function(fs) {
              return fs.length === 2;
            });
            _.assign(entry.fields, _.fromPairs(fields));
          }
          if (info === '#EXT-X-STREAM-INF' || info === '#EXTINF') {
            entry.url = lines[i + 1];
          }
          results.push(entry);
        }
        return results;
      })();
      directives = entries.map(function(entry) {
        return entry.directive;
      });
      if (indexOf.call(directives, '#EXT-X-STREAM-INF') >= 0) {
        return hlsMasterIndexHandler(iurl, entries, opath);
      } else if (indexOf.call(directives, '#EXTINF') >= 0 && (indexOf.call(directives, 'EXT-X-MEDIA-SEQUENCE') >= 0 || indexOf.call(directives, 'EXT-X-TARGETDURATION') >= 0)) {
        return hlsDownloader(iurl, opath);
      }
    });
  };

  hlsMasterIndexHandler = function(from, entries, opath) {
    var entry, i, j, len, ref, ref1, ref2;
    entries = entries.filter(function(entry) {
      return entry.directive === '#EXT-X-STREAM-INF';
    });
    for (i = j = 0, len = entries.length; j < len; i = ++j) {
      entry = entries[i];
      entry._bandwith = parseInt(entry.fields['BANDWIDTH']);
      entry._resolution = (ref = (ref1 = entry.fields['RESOLUTION']) != null ? ref1.split('x') : void 0) != null ? (ref2 = ref.map(function(v) {
        return parseInt(v);
      })) != null ? ref2.reduce(function(a, b) {
        return a * b;
      }) : void 0 : void 0;
      entry._i = -1 * i;
    }
    entry = _.last(_.sortBy(entries, ['_bandwith', '_resolution', '_i']));
    return hlsDownloader(url.resolve(from, entry.url), opath);
  };

  hlsDownloader = function(input, output) {
    var cmd, ls;
    console.log("Download URL: " + input);
    cmd = ['-y', '-user-agent', settings.userAgent, '-i', input, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', output];
    ls = childProcess.spawn('ffmpeg', cmd, {
      'stdio': 'inherit'
    });
    return ls.on('close', function(code) {
      if (code !== 0) {
        return console.error("child process exited with code " + code);
      }
    });
  };

  dl = function(iurl, opath, type) {
    var ref;
    if (iurl == null) {
      return;
    }
    if (type == null) {
      type = (ref = iurl.match(/.+\.(.+?)$/)) != null ? ref[1] : void 0;
    }
    if (type === 'm3u' || type === 'm3u8') {
      return m3uHandler(iurl, opath);
    }
  };

  main();

}).call(this);
