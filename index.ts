#!/usr/bin/env node

import * as logger from 'winston';
import * as request from 'request';
import {platform} from 'os';
import * as compareVersions from 'compare-versions';
import {Client} from 'discord-rpc';

let nodeSpotifyWebhelper: any;
if (platform().toString() === "win32") {
    nodeSpotifyWebhelper = require('./spotify-webhelper/windows');
} else {
    nodeSpotifyWebhelper = require('./spotify-webhelper/linux');
}
const spotify = new nodeSpotifyWebhelper.SpotifyWebHelper();

const clientId = '383639700994523137';
const rpc = new Client({transport: 'ipc'});

let compareURI: string;
let compare: boolean;
let largeImage: string;
let songNameBool: boolean;
let songAlbumBool: boolean;

const christmasCheck = [
    'christmas',
    'xmas',
    'santa',
    'snow',
    'rudolph',
    'holiday'
];


logger.configure({
    transports: [
        new logger.transports.Console({
            colorize: true
        })
    ]
});

async function xmasSongCheck(songName: string): Promise<boolean> {
    let bool: boolean = false;
    christmasCheck.forEach((check) => {
        if (songName.includes(check)) {
            bool = true;
        } else bool = bool === true;
    });
    return bool;
}

async function xmasAlbumCheck(albumName: string): Promise<boolean> {
    let bool: boolean = false;
    christmasCheck.forEach((check) => {
        if (albumName.includes(check)) {
            bool = true;
        } else bool = bool === true;
    });
    return bool;
}

function updateRichPresence() {
    if (!rpc) return;

    spotify.getStatus(async (err: Error, res: any) => {
        if (err) return logger.error(err.stack ? err.stack : err.toString());
        if (!res.track || !res.track.track_resource) return logger.warn(`(${new Date().toLocaleTimeString()}) No track data, make sure Spotify is opened and a song is selected!`);

        if (res.playing === true) {
            compare = false;
            if (res.track.track_resource.uri === compareURI) return;

            let start = parseInt(new Date().getTime().toString().substr(0, 10));
            let end = start + (res.track.length - res.playing_position);
            compareURI = res.track.track_resource.uri;

            let songName = res.track.track_resource.name;
            let songArtist = res.track.artist_resource ? res.track.artist_resource.name : '';
            let songAlbum = res.track.album_resource ? res.track.album_resource.name : '';

            try {
                songNameBool = await xmasSongCheck(songName.toLowerCase());
            } catch (error) {
                logger.error('Oops something went wrong checking for a christmas song: ' + error);
            }

            if (songNameBool === true) {
                largeImage = 'spotifylargexmas';
            } else {
                try {
                    songAlbumBool = await xmasAlbumCheck(songAlbum.toLowerCase());
                } catch (error) {
                    logger.error('Oops something went wrong checking for a christmas song: ' + error);
                }
                if (songAlbumBool === true) {
                    largeImage = 'spotifylargexmas';
                } else if ((songAlbumBool === false || !songAlbumBool) && songNameBool === false) {
                    largeImage = 'spotifylarge';
                }
            }

            rpc.setActivity({
                details: `🎵 Song - ${songName}`,
                state: `👤 Artist - ${songArtist}`,
                startTimestamp: start,
                endTimestamp: end,
                largeImageKey: largeImage,
                largeImageText: `💿 Album - ${songAlbum}`,
                smallImageKey: 'playing',
                smallImageText: 'Playing',
                instance: false
            });

            logger.info(`(${new Date().toLocaleTimeString()}) Updated Song - ${res.track.track_resource.name} by ${res.track.artist_resource ? res.track.artist_resource.name : ''}`);
        } else {
            if (compare === true) return;
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

async function checkVersion(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        const version: string = require('../package.json').version;
        request('https://raw.githubusercontent.com/KurozeroPB/discotify/cli/package.json', (e, resp, body) => {
            if (e) return reject(e);
            if (resp.statusCode !== 200) {
                reject(`Failed to check for updates: ${resp.statusMessage}`);
            } else {
                const latest: string = JSON.parse(body).version;
                const result = compareVersions(version, latest);
                resolve(result !== -1);
            }
        });
    });
}

function kill() {
    process.exit(0);
    setTimeout(() => {
        process.exit(0);
    }, 5000);
}

const [, , ...args] = process.argv;

if ((args[0]) && (args[0].toLowerCase() === "--start" || args[0].toLowerCase() === "-s")) {
    rpc.login(clientId).catch((e) => {
        logger.error(e);
        kill();
    });
} else if ((args[0]) && (args[0].toLowerCase() === "--help" || args[0].toLowerCase() === "-h")) {
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
|                                       |
| Options:                              |
| --start/-s        Start the script    |
| --help/-h         Show this message   |
|_______________________________________|
	`);
} else {
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
|                                       |
| Options:                              |
| --start/-s        Start the script    |
| --help/-h         Show this message   |
|_______________________________________|
	`);
}

process.on('unhandledRejection', (e: any) => logger.error(e));
process.on('SIGINT', () => kill());
rpc.on('error', (e: any) => logger.error(e));
rpc.on('ready', async () => {
    try {
        const isUpdated = await checkVersion();
        if (isUpdated) {
            const version: string = require('../package.json').version;
            logger.info(`Discotify is up-to-date using v${version}`);
            setInterval(() => updateRichPresence(), 1500);
        } else {
            logger.error(`A new version of Discotify is avalible. Please get the latest version by running npm install -g discotify@latest or yarn global add discotify`);
            kill();
        }
    } catch (e) {
        logger.error(e.stack ? e.stack : e.message ? e.message : e.toString());
    }
});
