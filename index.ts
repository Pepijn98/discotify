#!/usr/bin/env node

import * as DiscordRPC from 'discord-rpc';
import * as logger from 'winston';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { platform } from 'os';

let nodeSpotifyWebhelper;
if (platform().toString() === "win32") {
	nodeSpotifyWebhelper = require('./spotify-webhelper/windows');
} else {
	nodeSpotifyWebhelper = require('./spotify-webhelper/linux');
}

const spotify = new nodeSpotifyWebhelper.SpotifyWebHelper();
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const clientID = '383639700994523137';

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
	let bool: boolean;
	christmasCheck.forEach((check) => {
		if (songName.includes(check)) {
			bool = true;
		} else if (bool === true) {
			bool = true;
		} else {
			bool = false;
		}
	});
	return bool;
};

async function xmasAlbumCheck(albumName: string): Promise<boolean> {
	let bool: boolean;
	christmasCheck.forEach((check) => {
		if (albumName.includes(check)) {
			bool = true;
		} else if (bool === true) {
			bool = true;
		} else {
			bool = false;
		}
	});
	return bool;
};

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
				instance: false,
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
};

async function checkVersion(): Promise<void> {
	let sVersion: string = require('../package.json').version;
	let version = ~~(require('../package.json').version.split('.').join(''));
	axios.get('https://raw.githubusercontent.com/KurozeroPB/discotify/cli/package.json')
		.then((res: AxiosResponse) => {
			if (res.status !== 200) {
				logger.error(`Failed to check for updates: ${res.data}`);
			} else {
				let latest = ~~(res.data.version.split('.').join(''));

				let tempString: string;
				if (latest.toString().length === 3) {
					tempString = latest.toString() + '0'
					latest = parseInt(tempString);
				}
				let tempString2: string;
				if (version.toString().length === 3) {
					tempString = version.toString() + '0'
					version = parseInt(tempString2);
				}

				if (latest > version) {
					logger.error(`A new version of Discotify is avalible\nPlease get the latest version from: https://www.npmjs.com/package/discotify\nOr run npm install -g discotify@${res.data.version}`);
					kill();
				} else {
					logger.info(`Discotify is up-to-date using v${sVersion}`);
				}
			}
		}).catch((err: AxiosError) => {
			logger.error(err.stack ? err.stack : err.message ? err.message : err.toString());
		});
};

function kill() {
	rpc.destroy()
		.then(() => {
			process.exit(0);
			setTimeout(() => {
				process.exit(0);
			}, 5000);
		}).catch((err) => logger.error(err.stack ? err.stack : err.toString()));
};

const [, , ...args] = process.argv;

if ((args[0]) && (args[0].toLowerCase() === "--start" || args[0].toLowerCase() === "-s")) {
	rpc.on('ready', async () => {
		try {
			await checkVersion();
		} catch (e) {
			return logger.error(e);
		}

		logger.info(`Connected with ID: ${clientID}`);
		updateRichPresence();
		setInterval(() => {
			updateRichPresence();
		}, 1500);
	});

	rpc.login(clientID)
		.catch((err: Error) => logger.error(err.stack ? err.stack : err.toString()));
} else if ((args[0]) && (args[0].toLowerCase() === "--help" || args[0].toLowerCase() === "-h")) {
	console.log(`
  _____  _               _   _  __       
 |  __ \\(_)             | | (_)/ _|      
 | |  | |_|___  ___ ___ | |_|_| |_ _   _ 
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
 | |  | |_|___  ___ ___ | |_|_| |_ _   _ 
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

process.on('SIGINT', () => kill());