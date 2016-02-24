util = require 'util'
path = require 'path'
fs = require 'fs'
childProcess = require 'child_process'
url = require 'url'
os = require 'os'

_ = require 'lodash'

filedir = (path.dirname fs.realpathSync __filename)

settings = require path.join filedir, 'settings.json'

argv = require 'yargs'
  .usage 'Usage: stream-dl [options] <url>'
  .nargs 'o', 1
  .describe 'o', 'Output file path'
  .demand 1
  .help 'h'
  .alias 'h', 'help'
  .version ->
    require(path.join filedir, '..', 'package.json').version
  .argv

urls = argv._

getOutputFileName = (name, host, i) ->
  if not name?
    name = _.last host?.split('/')
    name = name?.match(/(.+?)(\?.*)?$/)[1]
    return if not name?
  if i >= 1
    fnames = (path.basename name).split('.')
    fnames[0] += "-#{i}"
    name = path.join (path.dirname name), (fnames.join '.')
  return name

main = ->
  for iurl, i in urls
    opath = getOutputFileName argv.o, iurl, i
    if not opath?
      console.error 'Invalid output path'
      continue
    if not iurl.match /.+\.(m3u|m3u8)(\?.*)?$/
      casperjs = path.join filedir, '..', 'node_modules', '.bin', 'casperjs'
      fetchjs = path.join filedir, 'fetch.js'
      args = ['--engine=slimerjs', fetchjs, iurl]
      cmd = [casperjs, args.join(' ')].join(' ')
      exec = if os.platform() != 'win32'
      then childProcess.execFile.bind undefined, 'casperjs', args
      else childProcess.exec.bind undefined, cmd
      exec (err, stdout, stderr) ->
        out = _.last (stdout.trim().split '\n')
        {url: iurl_, type} = JSON.parse out
        dl iurl_, opath, type
    else
      dl iurl, opath

m3uHandler = (iurl, opath) ->
  extname = path.extname opath
  if extname in ['.m3u', '.m3u8', '']
    opath = (_.trimEnd opath, extname) + '.mp4'

  console.log "Input URL: #{iurl}"
  console.log "Output File: #{opath}"

  args = [iurl]
  args = _.concat ['-k'], args if os.platform() == 'win32'
  childProcess.execFile 'curl', args, (err, stdout, stderr) ->
    lines = stdout.split('\n').map (line) -> line.trim()
    return if '#EXTM3U' != lines[0]
    entries = for line, i in lines
      [info, field] = line.split ':'
      continue if not info.startsWith '#'
      entry =
        'directive': info
        'fields': field?.match(/([^,]*".*"|[^,]+)/g)
      if entry.fields?
        fields = entry.fields
          .map (field) -> field.split('=')
          .filter (fs) -> fs.length == 2
        _.assign entry.fields, _.fromPairs fields
      if info in ['#EXT-X-STREAM-INF', '#EXTINF']
        entry.url = lines[i+1]
      entry
    directives = (entries.map (entry) -> entry.directive)
    if '#EXT-X-STREAM-INF' in directives
      hlsMasterIndexHandler iurl, entries, opath
    else if '#EXTINF' in directives and
    ('EXT-X-MEDIA-SEQUENCE' in directives or
    'EXT-X-TARGETDURATION' in directives)
      hlsDownloader iurl, opath

hlsMasterIndexHandler = (from, entries, opath) ->
  entries = entries.filter (entry) -> entry.directive == '#EXT-X-STREAM-INF'
  for entry, i in entries
    entry._bandwith = parseInt entry.fields['BANDWIDTH']
    entry._resolution = (entry.fields['RESOLUTION']?.split 'x')
      ?.map (v) -> parseInt v
      ?.reduce (a,b) -> a * b
    entry._i = -1 * i
  entry = _.last _.sortBy entries, ['_bandwith', '_resolution', '_i']
  hlsDownloader (url.resolve from, entry.url), opath

hlsDownloader = (input, output) ->
  console.log "Download URL: #{input}"
  cmd = [
    '-y'
    '-user-agent', settings.userAgent
    '-i', input
    '-c', 'copy'
    '-bsf:a', 'aac_adtstoasc'
    output
  ]
  #console.log "ffmpeg #{cmd.join ' '}"
  ls = childProcess.spawn 'ffmpeg', cmd, {'stdio': 'inherit'}
  ls.on 'close', (code) ->
    console.error "child process exited with code #{code}" if code != 0

dl = (iurl, opath, type) ->
  return if not iurl?
  if not type?
    type = iurl.match(/.+\.(.+?)$/)?[1]
  if type in ['m3u', 'm3u8']
    m3uHandler iurl, opath

main()
