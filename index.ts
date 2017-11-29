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

async function updateRichPresence() {
	if (!rpc) return;

	spotify.getStatus(async (e: Error, res: any) => {
		let err: any = e;
		if (e) return logger.error(err);

		if (!res.track.track_resource) throw new Error("Track data is undefined");

		if (res.track.track_resource.uri === compareURI) return;

		let start = parseInt(new Date().getTime().toString().substr(0, 10));
		let end = start + (res.track.length - res.playing_position);
		compareURI = await res.track.track_resource.uri;

		rpc.setActivity({
			details: `🎵 Listening to ${res.track.track_resource.name} by ${res.track.artist_resource.name}`,
			startTimestamp: start,
			endTimestamp: end,
			largeImageKey: largeImageKey,
			largeImageText: largeImageText,
			instance: false,
		});

		logger.info(`(${new Date().toLocaleTimeString()}) Updated Song - ${res.track.track_resource.name} by ${res.track.artist_resource.name}`);
	});
};

rpc.on('ready', () => {
	logger.info(`Starting with clientId ${clientID}`);
	updateRichPresence()
		.catch((err: any) => logger.error(err));
	setInterval(() => {
		updateRichPresence()
			.catch((err: any) => logger.error(err));
	}, 1500);
});

rpc.login(clientID)
	.catch((err: any) => logger.error(err));