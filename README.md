stream-dl
=========
Download streaming videos from websites.

**stream-dl** takes an URL of a video player webpage.
It loads the website internally to get a video URL.
Finally, the obtained URL will be sent to *ffmpeg* for conversion.

As of this moment, it only supports HLS protocol.

Dependencies
------------
These programs should be on the PATH.
+ Node.js
+ FFmpeg

Install
-------
```
npm install -g stream-dl
```

Usage
-----
```
stream-dl [options] <url>
```

Example
-------
```
stream-dl -o video.mp4 http://example.com/path/to/watch/page
```

Build
-----
```
npm install
npm run build
```
