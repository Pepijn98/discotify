import * as DiscordRPC from 'discord-rpc';
import * as logger from 'winston';
import { platform } from 'os';

let nodeSpotifyWebhelper;
if (platform().toString() === "win32") {
	nodeSpotifyWebhelper = require('./spotify-webhelper/windows');
} else {
	nodeSpotifyWebhelper = require('./spotify-webhelper/linux');
}

logger.configure({
	transports: [
		new logger.transports.Console({
			colorize: true
		})
	]
});

const spotify = new nodeSpotifyWebhelper.SpotifyWebHelper();
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const clientID = '383639700994523137';
const largeImageKey = 'spotifylarge';
const largeImageText = 'Spotify';

let compareURI: string;

function updateRichPresence() {
	if (!rpc) return;

	spotify.getStatus((err: Error, res: any) => {
		if (err) return logger.error(err.toString());

		if (!res.track || !res.track.track_resource) {
			rpc.setActivity({
				details: `🎵 Nothing is playing`,
				startTimestamp: 0,
				endTimestamp: 0,
				largeImageKey: largeImageKey,
				largeImageText: largeImageText,
				smallImageKey: 'paused',
				smallImageText: 'Paused',
				instance: false
			});

			return logger.warn(`(${new Date().toLocaleTimeString()}) No track data, make sure Spotify is opened and a song is playing!`);
		}

		if (res.track.track_resource.uri === compareURI) return;

		let start = parseInt(new Date().getTime().toString().substr(0, 10));
		let end = start + (res.track.length - res.playing_position);
		compareURI = res.track.track_resource.uri;

		rpc.setActivity({
			details: `🎵 Listening to ${res.track.track_resource.name} by ${res.track.artist_resource.name}`,
			startTimestamp: start,
			endTimestamp: end,
			largeImageKey: largeImageKey,
			largeImageText: largeImageText,
			smallImageKey: 'playing',
			smallImageText: 'Playing',
			instance: false,
		});

		logger.info(`(${new Date().toLocaleTimeString()}) Updated Song - ${res.track.track_resource.name} by ${res.track.artist_resource.name}`);
	});
};

rpc.on('ready', () => {
	logger.info(`Connected with ID: ${clientID}`);
	updateRichPresence();
	setInterval(() => {
		updateRichPresence();
	}, 1500);
});

rpc.login(clientID)
	.catch((err: Error) => logger.error(err.toString()));