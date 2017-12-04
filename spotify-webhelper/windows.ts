import * as request from 'request';
import { stringify } from 'querystring';
import { format } from 'util';
import { join } from 'path';
import { spawn, exec } from 'child_process';

let wintools: any;
let spotifyWebHelperWinProcRegex: any;

const DEFAULT_PORT = 4381;
const DEFAULT_PROTOCOL = 'http';
const DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap']
const DEFAULT_RETURN_AFTER = 1
const ORIGIN_HEADER = { 'Origin': 'https://open.spotify.com' }
const FAKE_USERAGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';


function getJson(url: string, params?: any, headers?: any, cb?: any) {
    if (params instanceof Function) {
        cb = params;
        params = null;
        headers = null;
    }

    if (headers instanceof Function) {
        cb = headers;
        headers = null;
    }

    headers = headers || {}
    cb = cb || function () { };
    if (params)
        url += '?' + stringify(params)
    
    headers['User-Agent'] = FAKE_USERAGENT;
    
    request({ 'url': url, 'headers': headers, 'rejectUnauthorized' : false}, function (err: Error, _req: any, body: any) {
        if (err) {
            return cb(err);
        }

        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        }
        catch (e) {
            return cb(e);
        }

        return cb(null, parsedBody);
    });
}

function generateRandomString(length: number) {
    return Math.random().toString(36).substr(length);
}

function generateRandomLocalHostName() {
    return generateRandomString(10) + '.spotilocal.com'
}

function getOauthToken(cb: any) {
    return getJson('http://open.spotify.com/token', function (err: Error, res: any) {
        if (err) {
            return cb(err);
        }

        return cb(null, res['t']);
    });
}

function isSpotifyWebHelperRunning(cb: any) {
  cb = cb || function () { };
  if (process.platform != 'win32')  {
    return cb(null, true);
  }

  wintools = function (callback: any) {
    if (!callback) callback = function (_err: Error, _list: any) { };

    exec('wmic process list /format:csv', { maxBuffer: 2000 * 1024 }, function (err, stdout, _stderr) {
        if (err) {
            callback({ err: err, msg: "unable to enumerate processes" });
            return;
        }

        let newStdout = stdout.replace(/\r/g, '').split('\n').slice(1);
        let fields = newStdout.shift().split(',');

        let output: any = {};
        newStdout.forEach(function (line) {

            let parts = line.split(',');
            let entry: any = {};
            for (let i = 0; i < fields.length; ++i) {
                entry[fields[i]] = parts[i];
            }

            let e = {
                pid: entry.Handle,
                desc: entry.Description,
                cmd: entry.CommandLine,
                prog: entry.ExecutablePath,
                workingSet: entry.WorkingSetSize,
            };

            if (!e.cmd) delete e.cmd;
            if (!e.prog) delete e.prog;

            if (e.pid) {
                output[e.pid] = e;
            }
        });

        callback(null, output);
    });
};
  
  wintools(function (err: Error, lst: any) {
    if (err) {
      return cb(err);
    }

    spotifyWebHelperWinProcRegex = spotifyWebHelperWinProcRegex || new RegExp('spotifywebhelper.exe', 'i');

    for (let k in lst) {
      if (spotifyWebHelperWinProcRegex.test(lst[k].desc)) {
        return cb(null, true);
      }
      spotifyWebHelperWinProcRegex.lastIndex = 0;
    };
    cb(null, false);
  });
}

function getWindowsSpotifyWebHelperPath() {
  if (!process.env.USERPROFILE) {
    return null;
  }

  return join(process.env.USERPROFILE, 'AppData\\Roaming\\Spotify\\Data\\SpotifyWebHelper.exe');
}

function launchSpotifyWebhelperIfNeeded(cb: any) {
  cb = cb || function () { };
  if (process.platform != 'win32') {
    return cb(null, true);
  }

  isSpotifyWebHelperRunning(function (err: Error, res: any) {
    if (err) {
      return cb(err);
    }

    if (res) {
      return cb(null, res);
    }

    let exePath = getWindowsSpotifyWebHelperPath();

    if (!exePath) {
      return cb(new Error('Failed to retreive SpotifyWebHelper exe path'));
    }

    let fakeArr: string[];

    let child = spawn(exePath, fakeArr, { detached: true, stdio: 'ignore' });
    child.unref();

    return cb(null, true);
  });

}

function SpotifyWebHelper(opts: any): void {
    if (!(this instanceof SpotifyWebHelper)) {
        return new SpotifyWebHelper(opts);
    }

    opts = opts || {};
    let localPort = opts.port || DEFAULT_PORT;
    let localProto = opts.protocol || DEFAULT_PROTOCOL;

    function generateSpotifyUrl(url: string) {
        return format("%s://%s:%d%s", localProto, generateRandomLocalHostName(), localPort, url)
    }

    function getCsrfToken(cb: any) {
        let url = generateSpotifyUrl('/simplecsrf/token.json');
        return getJson(url, null, ORIGIN_HEADER, function (err: Error, res: any) {
            if (err) {
                return cb(err);
            }

            return cb(null, res['token']);
        });
    }

    this.isInitialized = false;

    this.init = function (cb: any) {
        let self = this;
        cb = cb || function () { };
        if (self.isInitialized) {
            return cb();
        }
        
        launchSpotifyWebhelperIfNeeded(function (err: Error, res: any) {
          if (err) {
            return cb(err);
          }

          if (!res) {
            return cb(new Error('SpotifyWebHelper not running, failed to start it'));
          }

          getOauthToken(function (err: Error, oauthToken: string) {
              if (err) {
                  return cb(err);
              }

              self.oauthToken = oauthToken;

              getCsrfToken(function (err: Error, csrfToken: string) {
                  if (err) {
                      return cb(err);
                  }

                  self.csrfToken = csrfToken;
                  self.isInitialized = true;
                  return cb();
              });
          });
        });
    }

    function spotifyJsonRequest(self: any, spotifyRelativeUrl: string, additionalParams?: any, cb?: any) {
      cb = cb || function () { };
      additionalParams = additionalParams || {};

      self.init(function (err: Error) {
        if (err) {
          return cb(err);
        }

        let params: any = {
          'oauth': self.oauthToken,
          'csrf': self.csrfToken,
        }

        for (let key in additionalParams) {
          params[key] = additionalParams[key];
        }

        let url = generateSpotifyUrl(spotifyRelativeUrl);
        getJson(url, params, ORIGIN_HEADER, cb);
      });
    }

    this.getStatus = function (returnAfter: any, returnOn: any, cb: any) {

        if (returnAfter instanceof Function) {
            cb = returnAfter;
            returnAfter = null;
            returnOn = null;
        }

        if (returnOn instanceof Function) {
            cb = returnOn;
            returnOn = null;
        }

        returnOn = returnOn || DEFAULT_RETURN_ON;
        returnAfter = returnAfter || DEFAULT_RETURN_AFTER;

        cb = cb || function() {};

        let params = {
          'returnafter': returnAfter,
          'returnon': returnOn.join(',')
        }

        spotifyJsonRequest(this, '/remote/status.json', params, cb);
    }

    this.pause = function (cb: any) {
      cb = cb || function() {};

      let params = {
        'pause' : true
      }

      spotifyJsonRequest(this, '/remote/pause.json', params, cb);
    }

    this.unpause = function (cb: any) {
      cb = cb || function () { };

      let params = {
        'pause': false
      }

      spotifyJsonRequest(this, '/remote/pause.json', params, cb);
    }

    this.play = function (spotifyUri: string, cb: any) {
      cb = cb || function () { };

      let params = {
        'uri': spotifyUri,
        'context': spotifyUri
     }

      spotifyJsonRequest(this, '/remote/play.json', params, cb);
    }

    this.getVersion = function(cb: any) {
        let url = generateSpotifyUrl('/service/version.json');
        return getJson(url, { 'service': 'remote' }, ORIGIN_HEADER, cb)
    }

    this.getLocalHostname = function() {
      return generateRandomLocalHostName();
    }
}

module.exports.SpotifyWebHelper = SpotifyWebHelper;
