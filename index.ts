#!/usr/bin/env ts-node

const DiscordRPC = require('discord-rpc');
const logger = require('winston');
const axios = require('axios');
const { platform } = require('os');
const nodeSpotifyWebhelper = require('./spotify-webhelper/spotify');

const [, , ...args] = process.argv;

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
	if (!rpc) return;

	spotify.getStatus((err, res) => {
		if (err) return logger.error(err.stack ? err.stack : err.toString());
		if (!res.track || !res.track.track_resource) return logger.warn(`(${new Date().toLocaleTimeString()}) No track data, make sure Spotify is opened and a song is selected!`);

		if (res.playing === true) {
			compare = false;
			if (res.track.track_resource.uri === compareURI) return;

			let start = parseInt(new Date().getTime().toString().substr(0, 10));
			let end = start + (res.track.length - res.playing_position);
			compareURI = res.track.track_resource.uri;

			rpc.setActivity({
				details: `🎵 Song - ${res.track.track_resource.name}`,
				state: `👤 Artist - ${res.track.artist_resource.name}`,
				startTimestamp: start,
				endTimestamp: end,
				largeImageKey: 'spotifylarge',
				largeImageText: `💿 Album - ${res.track.album_resource.name}`,
				smallImageKey: 'playing',
				smallImageText: 'Playing',
				instance: false,
			});

			logger.info(`(${new Date().toLocaleTimeString()}) Updated Song - ${res.track.track_resource.name} by ${res.track.artist_resource.name}`);
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

function checkVersion() {
	let sVersion = require('./package.json').version;
	let version = ~~(require('./package.json').version.split('.').join(''));
	axios.get('https://raw.githubusercontent.com/KurozeroPB/discotify/cli/package.json')
		.then((res) => {
			if (res.status !== 200) {
				return logger.error(`Failed to check for updates: ${res.data}`);
			} else {
				let latest = ~~(res.data.version.split('.').join(''));
				if (latest > version) {
					logger.error(`A new version of Discotify is avalible\nPlease get the latest version from: https://www.npmjs.com/package/discotify\nOr run npm install -g discotify@${res.data.version}`);
					return kill();
				}
				return logger.info(`Discotify is up-to-date using v${sVersion}`);
			}
		}).catch((err) => {
			logger.error(err.stack ? err.stack : err.message ? err.message : err.toString());
			kill();
		});
};

function kill() {
	rpc.destroy()
		.then(() => {
			process.exit(0);
		}).catch((err) => logger.error(err.stack ? err.stack : err.toString()));
};

if (args[0] && args[0].toLocaleLowerCase() === "start") {
	checkVersion();
	rpc.on('ready', () => {
		logger.info(`Connected with ID: ${clientID}`);
		updateRichPresence();
		setInterval(() => {
			updateRichPresence();
		}, 1500);
	});

	rpc.login(clientID)
		.catch((err) => logger.error(err.stack ? err.stack : err.toString()));
} else {
	console.log(`
 _______________________________________
|                                       |
| discotify start - to start the script |
|_______________________________________|
	`);
}

process.on('SIGINT', () => {
	kill();
});