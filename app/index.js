#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DiscordRPC = require("discord-rpc");
const logger = require("winston");
const axios_1 = require("axios");
const os_1 = require("os");
let nodeSpotifyWebhelper;
if (os_1.platform().toString() === "win32") {
    nodeSpotifyWebhelper = require('./spotify-webhelper/windows');
}
else {
    nodeSpotifyWebhelper = require('./spotify-webhelper/linux');
}
const spotify = new nodeSpotifyWebhelper.SpotifyWebHelper();
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const clientID = '383639700994523137';
let compareURI;
let compare;
logger.configure({
    transports: [
        new logger.transports.Console({
            colorize: true
        })
    ]
});
function updateRichPresence() {
    if (!rpc)
        return;
    spotify.getStatus((err, res) => {
        if (err)
            return logger.error(err.stack ? err.stack : err.toString());
        if (!res.track || !res.track.track_resource)
            return logger.warn(`(${new Date().toLocaleTimeString()}) No track data, make sure Spotify is opened and a song is selected!`);
        if (res.playing === true) {
            compare = false;
            if (res.track.track_resource.uri === compareURI)
                return;
            let start = parseInt(new Date().getTime().toString().substr(0, 10));
            let end = start + (res.track.length - res.playing_position);
            compareURI = res.track.track_resource.uri;
            rpc.setActivity({
                details: `🎵 Song - ${res.track.track_resource.name}`,
                state: `👤 Artist - ${res.track.artist_resource ? res.track.artist_resource.name : ''}`,
                startTimestamp: start,
                endTimestamp: end,
                largeImageKey: 'spotifylarge',
                largeImageText: `💿 Album - ${res.track.album_resource ? res.track.album_resource.name : ''}`,
                smallImageKey: 'playing',
                smallImageText: 'Playing',
                instance: false,
            });
            logger.info(`(${new Date().toLocaleTimeString()}) Updated Song - ${res.track.track_resource.name} by ${res.track.artist_resource ? res.track.artist_resource.name : ''}`);
        }
        else {
            if (compare === true)
                return;
            compare = true;
            compareURI = '';
            rpc.setActivity({
                details: `Paused`,
                startTimestamp: 0,
                endTimestamp: 0,
                largeImageKey: 'spotifylarge',
                largeImageText: '---',
                smallImageKey: 'paused',
                smallImageText: 'Paused',
                instance: false
            });
            logger.info(`(${new Date().toLocaleTimeString()}) Spotify is paused`);
        }
    });
}
;
async function checkVersion() {
    let sVersion = require('../package.json').version;
    let version = ~~(require('../package.json').version.split('.').join(''));
    axios_1.default.get('https://raw.githubusercontent.com/KurozeroPB/discotify/cli/package.json')
        .then((res) => {
        if (res.status !== 200) {
            logger.error(`Failed to check for updates: ${res.data}`);
        }
        else {
            let latest = ~~(res.data.version.split('.').join(''));
            if (latest > version) {
                logger.error(`A new version of Discotify is avalible\nPlease get the latest version from: https://www.npmjs.com/package/discotify\nOr run npm install -g discotify@${res.data.version}`);
                kill();
            }
            else {
                logger.info(`Discotify is up-to-date using v${sVersion}`);
            }
        }
    }).catch((err) => {
        logger.error(err.stack ? err.stack : err.message ? err.message : err.toString());
    });
}
;
function kill() {
    rpc.destroy()
        .then(() => {
        process.exit(0);
        setTimeout(() => {
            process.exit(0);
        }, 5000);
    }).catch((err) => logger.error(err.stack ? err.stack : err.toString()));
}
;
const [, , ...args] = process.argv;
if ((args[0]) && (args[0].toLowerCase() === "--start" || args[0].toLowerCase() === "-s")) {
    rpc.on('ready', async () => {
        try {
            await checkVersion();
        }
        catch (e) {
            return logger.error(e);
        }
        logger.info(`Connected with ID: ${clientID}`);
        updateRichPresence();
        setInterval(() => {
            updateRichPresence();
        }, 1500);
    });
    rpc.login(clientID)
        .catch((err) => logger.error(err.stack ? err.stack : err.toString()));
}
else if ((args[0]) && (args[0].toLowerCase() === "--help" || args[0].toLowerCase() === "-h")) {
    console.log(`
  _____  _               _   _  __       
 |  __ \\(_)             | | (_)/ _|      
 | |  | |_ ___  ___ ___ | |_ _| |_ _   _ 
 | |  | | / __|/ __/ _ \\| __| |  _| | | |
 | |__| | \\__ \\ (_| (_) | |_| | | | |_| |
 |_____/|_|___/\\___\\___/ \\__|_|_|  \\__, |
                                    __/ |
                                   |___/ 
 _______________________________________
|                                       |
| discotify [option]                    |
| Options:                              |
| --start/-s        Start the script    |
| --help/-h         Show this message   |
|_______________________________________|
	`);
}
else {
    console.log(`
  _____  _               _   _  __       
 |  __ \\(_)             | | (_)/ _|      
 | |  | |_ ___  ___ ___ | |_ _| |_ _   _ 
 | |  | | / __|/ __/ _ \\| __| |  _| | | |
 | |__| | \\__ \\ (_| (_) | |_| | | | |_| |
 |_____/|_|___/\\___\\___/ \\__|_|_|  \\__, |
                                    __/ |
                                   |___/ 
 _______________________________________
|                                       |
| discotify [option]                    |
| Options:                              |
| --start/-s        Start the script    |
| --help/-h         Show this message   |
|_______________________________________|
	`);
}
process.on('SIGINT', () => kill());
