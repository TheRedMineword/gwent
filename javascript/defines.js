"use strict"
let twoPlayersConnected = false; //host alone
let extraJSON = null;
let displaynow = null;
const showbankms = 9000;
let gameended = false;
 //host alone
const players = {
	'me': "You", "op": "Opponent", "noflag": "", "sys": "Gwent Bot"
}
const fullscreenConfig = {
	'localhost': false,
	'else': true
}

const OnGameStartDraw = 2;
const tooltipQueue = [];
let tooltipActive = false;
const ForGameStart = {
 'unitscards': 22,
 'special': 10,
 'hero': 9
};
const killoverpowercard = 999;
const darknessstorm_await = false;
const maxhealth = 2; // Dont change it, it also should do nothing
const thishandsize = 10;

const sendQueue = [];
let queueRunning = false;


let herocardsdb = [];
const herocardanim = false; // Disabled before i can fix aniamtion to be schorch like
let gameID = 0;

const SEND_INTERVAL_MS = 700; // change this to desired wait time


const ui_display_times = {
	'socketready': 3000,
	'hold_pause': {
		'sleep': 78,
		'needs': 6
	},
	'queue': [],
	'is_running': false,
	'is_busy': false,
	'round_end_result': 2200,
	'notyfication': 2200, // From async notification(name, duration) // a fail save value
	'fadeSpeed': 150,
	'checkDelay': 25,
	'pass': 1320,
	'turn': 1200,
	'round_start': 1200,
	'coin': 1200,
	'faction_ability': 2700,
	'show_me_that_card_you_have': 2900
}


const RegisterMovesHold = 2700 + SEND_INTERVAL_MS + ui_display_times.show_me_that_card_you_have; //If op passed wait before moves
const resync_wait = 1000 * 0.01;

ui_display_times.is_transitioning = false;
const ongame_start_eval = "console.log(\"evaled start game\");\n(function notificationRepeat() {\r\n  ui.notificationLoop();\r\n  setTimeout(notificationRepeat, ui_display_times.checkDelay);\r\n})();";

console.log("Game Start Config", ForGameStart, "hand size:", thishandsize, "ui_display_times", ui_display_times, "ongame_start_eval", ongame_start_eval);
const spy = {
    'spy': 2,
    'aid': 5,
    'sabotage': 1
};
const powergain = {
	'ForEachCardGain': 1.11,
	'CountSelf': false,
	'WeatherDebuffPercent': 0.25,
	'Ceil': false,
	'desc': null
}
powergain.desc = `Card base power grows by ${powergain.ForEachCardGain} for each card in the row (${powergain.CountSelf ? "including itself" : "excluding itself"}). Card base power is not affected by weather, but its bonus power is reduced by ${Math.round((1 - powergain.WeatherDebuffPercent) * 100)}% under weather effects. Values are rounded ${powergain.Ceil ? "up" : "down"}.`;

const axii = {
	"IfBasePowerUnder": 5,
	"TakeAway": 2,
	"desc": null
}
axii.desc = `Each card in row under Axii effect that base power is less than ${axii.IfBasePowerUnder} will lose ${axii.TakeAway} power. Debuffs dont stack. Dont affect hero cards`

console.log("Spy draw:", spy, "\nPowergain:", powergain, "\nAxii:", axii);

const nilfard_drawmaster =
{
	// Minimum hand size check:
	// Effect only triggers if player has LESS than this many cards in hand
	handshort: 3,

	// Maximum bonus draws from graveyard:
	// Each unit in grave = +1 draw, capped at this value
	drawdead: 2,

	// Base number of cards always drawn from deck
	drawalive: 1,

	// (Legacy / currently unused in logic)
	// Previously used as fallback draw amount when graveyard was insufficient
	drawiffail: 0,

	// Starting hand penalty:
	// Player begins the game with fewer cards based on this value
	cardban: 0,
	drawextra: 1
};

// Derived values:

// Player starts with (handshort - 1) fewer cards
// Example: handshort = 3 → start with 2 fewer cards
nilfard_drawmaster.cardban = -1 + nilfard_drawmaster.handshort;

// (Legacy formula, no longer used by current draw logic)
// Originally matched total fallback draw amount
nilfard_drawmaster.drawiffail =
	-1 + nilfard_drawmaster.drawdead + nilfard_drawmaster.drawalive;

console.log("nilfard_drawmaster", nilfard_drawmaster);


const audio_cache = {};
let buttonmutemode = 1;
let button_is_second_sheet = 0;
// In game, match in progress
const audio_yt_vid_soundtrack = "FTsuevfvQ9w"; // wild hunt: "UE9fPWy1_o4" // How about round of gwent: "FTsuevfvQ9w"
const audio_yt_vid_soundtrack_volume = 47; // 100 for wild hunt, less for other
// Tavern (Deck menu)
const tavern_yt_vid = "yu197hlNWK0"; // The Witcher 3: Wild Hunt OST - Skellige Tavern | Extended
const tavern_yt_volume = 100;
const gaunter_lider = {
	"extra_cards": 0.50,
	"revive": 0.60
}
let waitMusicAudio = null;
let waitMusicPlaying = false;
let cachedWaitMusicBlobUrl = null;

async function cacheWaitMusic() {
    // Load the Blob (assuming you fetch it from server or have it)
    const response = await fetch('sfx/oldgwent/Inline.ogg');
    const blob = await response.blob();
    cachedWaitMusicBlobUrl = URL.createObjectURL(blob);
}
async function play_wait_music() {
	console.log("[WAITING]", "PLAY");
    if (waitMusicPlaying) return; // Already playing
    
    waitMusicPlaying = true;
    const url = cachedWaitMusicBlobUrl || 'sfx/oldgwent/Inline.ogg';
    waitMusicAudio = new Audio(url);
    waitMusicAudio.loop = true;

    // Set volume to 60%
    waitMusicAudio.volume = 0.6; 

    try {
        await waitMusicAudio.play();
    } catch (e) {
        console.error("Failed to play wait music:", e);
    }

    while (waitMusicPlaying) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (waitMusicAudio) {
        waitMusicAudio.pause();
        waitMusicAudio = null;
    }
}
function stop_wait_music() {
	console.log("[WAITING]", "STOP");
    waitMusicPlaying = false;
    if (waitMusicAudio) {
        waitMusicAudio.pause();
        waitMusicAudio = null;
    }
}
function monitorVolume() {
    if (waitMusicAudio) {
        waitMusicAudio.volume = buttonmutemode === 1 ? 0.6 : 0; // 60% or mute
    }
   // console.log("WAITING DEBUG", buttonmutemode);
    // Schedule the next call
    setTimeout(monitorVolume, 100);
}

cacheWaitMusic();
monitorVolume();


console.log("gaunter_lider", gaunter_lider);
