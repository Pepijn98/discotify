import * as request from 'request';
import { stringify } from 'querystring';

const DEFAULT_PORT = 4381;
const DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap']
const DEFAULT_RETURN_AFTER = 1
const ORIGIN_HEADER = { 'Origin': 'https://open.spotify.com' }
const FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';

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

  headers['User-Agent'] = FAKE_USER_AGENT;

  request({ 'url': url, 'headers': headers, 'rejectUnauthorized': false }, function (err: Error, _req: any, body: any) {
    if (err) {
      return cb(err);
    }

    var parsedBody;
    try {
      parsedBody = JSON.parse(body);
    }
    catch (e) {
      return cb(e);
    }

    return cb(null, parsedBody);
  });
}

var ASCII_LOWER_CASE = "abcdefghijklmnopqrstuvwxyz";
function generateRandomString() {
  var text = "";

  for (var i = 0; i < 10; i++)
    text += ASCII_LOWER_CASE.charAt(Math.floor(Math.random() * ASCII_LOWER_CASE.length));

  return text;
}

function generateRandomLocalHostName() {
  return generateRandomString() + '.spotilocal.com'
}

function getOauthToken(cb: any) {
  return getJson('http://open.spotify.com/token', function (err: Error, res: any) {
    if (err) {
      return cb(err);
    }

    return cb(null, res['t']);
  });
}

function SpotifyWebHelper(opts: any): void {
  if (!(this instanceof SpotifyWebHelper)) {
    return new SpotifyWebHelper(opts);
  }

  opts = opts || {};
  var localPort = opts.port || DEFAULT_PORT;

  function generateSpotifyUrl(url: any) {
    return `http://${generateRandomLocalHostName()}:${localPort}${url}`;
  }

  function getCsrfToken(cb: any) {
    var url = generateSpotifyUrl('/simplecsrf/token.json');
    return getJson(url, null, ORIGIN_HEADER, function (err: Error, res: any) {
      if (err) {
        return cb(err);
      }

      return cb(null, res['token']);
    });
  }

  this.isInitialized = false;

  this.init = function (cb: any) {
    var self = this;
    cb = cb || function () { };
    if (self.isInitialized) {
      return cb();
    }

    getOauthToken(function (err: Error, oauthToken: any) {
      if (err) {
        return cb(err);
      }

      self.oauthToken = oauthToken;

      getCsrfToken(function (err: Error, csrfToken: any) {
        if (err) {
          return cb(err);
        }

        self.csrfToken = csrfToken;
        self.isInitialized = true;
        return cb();
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

      for (var key in additionalParams) {
        params[key] = additionalParams[key];
      }

      var url = generateSpotifyUrl(spotifyRelativeUrl);
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

    cb = cb || function () { };

    let params: any = {
      'returnafter': returnAfter,
      'returnon': returnOn.join(',')
    }

    spotifyJsonRequest(this, '/remote/status.json', params, cb);
  }

  this.pause = function (cb: any) {
    cb = cb || function () { };

    let params: any = {
      'pause': true
    }

    spotifyJsonRequest(this, '/remote/pause.json', params, cb);
  }

  this.unpause = function (cb: any) {
    cb = cb || function () { };

    let params: any = {
      'pause': false
    }

    spotifyJsonRequest(this, '/remote/pause.json', params, cb);
  }

  this.play = function (spotifyUri: string, cb: any) {
    cb = cb || function () { };

    let params: any = {
      'uri': spotifyUri,
      'context': spotifyUri
    }

    spotifyJsonRequest(this, '/remote/play.json', params, cb);
  }

  this.getVersion = function (cb: any) {
    var url = generateSpotifyUrl('/service/version.json');
    return getJson(url, { 'service': 'remote' }, ORIGIN_HEADER, cb)
  }

  this.getLocalHostname = function () {
    return generateRandomLocalHostName();
  }
}

module.exports.SpotifyWebHelper = SpotifyWebHelper;
