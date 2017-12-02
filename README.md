# discotify `0.2.19`
Spotify Rich Presence for Discord in TypeScript<br/>
*shows your currently playing song as a fancy rich presence in Discord*

Install globally with:<br/>
`npm install -g discotify@0.2.19`

## Requirements
  - NodeJS: best to get v8 or above. Get the one for your OS [here](https://nodejs.org/en/download/package-manager)
  - npm: Should automatically be installed with nodejs
  - Discord-ptb or canary:
    - ptb you can get from [here](https://discordapp.com/download) by clicking on "Get the Public Test Build"
    - Canary links: [win](https://discordapp.com/api/download/canary?platform=win), [linux](https://discordapp.com/api/download/canary?platform=linux), [osx](https://discordapp.com/api/download/canary?platform=osx)
  - Spotify: [win](https://www.spotify.com/nl/download/windows/), [linux](https://www.spotify.com/nl/download/linux/), [osx](https://www.spotify.com/nl/download/mac/)
  - You might additionally have to install ts-node and typescript globally
    - ts-node: `npm install -g ts-node` 
    - typescript: `npm install -g typescript`

## Usage
1. Make sure Spotify is open
2. Make sure either Discord-ptb or Discord-canary is open<br/>
<br/>
To start use:<br/>
`discotify start`<br/>
<br/>
To stop:<br/>
`ctrl + c` does the job

## Tested on
  - Linux Ubuntu 16.04 ✅
  - Windows 7 ✅
  
 *Got it working on an OS not listed above?<br/>Just make an issue and i'll add it.*
 <br/><br/>
 Result should look something like this:<br/>
![](https://b.catgirlsare.sexy/5ArD.png)
