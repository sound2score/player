---
name: sound2score-player
description: Embed sound2score sheet music on a website and control it from the page with @sound2score/player. Use when adding a sound2score score to a site, creating or attaching its embed, passing the viewer's user ID, playing, pausing, seeking, looping, changing speed, transposing or toggling the metronome from page code, or reacting to the embed's ready, change and unavailable events.
version: 0.0.4
---

# sound2score Player

`@sound2score/player` puts a sound2score score on a web page as an iframe and
lets the page drive it: play, pause, seek, loop bars, slow down, transpose and
click along, and hear back what the Player is doing.

```sh
npm install @sound2score/player
```

## Before you start

- The score's owner must be on a plan with embeds and must add your site
  (its origin, such as `https://school.example`) to the sites in their Embeds
  settings on sound2score. On any other site the embed shows why it can't
  play and raises `unavailable` with reason `site`.
- The score ID is the last part of its address: `sound2score.com/s/<scoreId>`.
- Each viewer of an embed counts as one of the owner's students. Pass
  `userId` (below) so a student counts once however many browsers they use.

## Create a new embed

```ts
import { Player } from "@sound2score/player";

const container = document.getElementById("score");
if (!container) {
	throw new Error("No #score element");
}
const player = Player.create(container, {
	scoreId: "abc123",
	// The ID your site knows this viewer by. Sent once, when the embed loads.
	userId: "student-42",
	options: {
		start: { speed: 80, bars: { from: 9, to: 16 } },
		controls: { transpose: "off", mixer: "open" },
		layout: { title: false },
		look: { theme: "volt", accent: "#ff00aa" },
	},
	height: 600,
});
```

The iframe fills the container's width. Anything left out of `options`
keeps its default, and look fields you leave out follow the owner's style.

## Attach to an embed already on the page

An iframe pasted from sound2score's Embed dialog works too:

```ts
import { Player } from "@sound2score/player";

const iframe = document.querySelector<HTMLIFrameElement>(
	'iframe[src*="sound2score.com/s/"]',
);
if (!iframe) {
	throw new Error("No sound2score embed on the page");
}
const player = Player.attach(iframe);
```

To pass a `userId` to a pasted iframe, add `u=<id>` to its `src` before it
loads. It can't be added later.

## Commands

```ts
import { Player } from "@sound2score/player";

declare const player: Player;

player.play();
player.pause();
player.seek(30); // seconds from the start
player.goToBar(17); // bars count from 1, in playback order
player.setLoop({ from: 9, to: 16 }); // both bars included
player.setLoop(null); // stop looping
player.setSpeed(75); // percent of the written tempo, 25 to 200
player.setTranspose(-2); // semitones from as written, -12 to 12
player.setMetronome(true);
```

- Commands given before the score is ready wait, then run in order.
- Commands work even when the embed's options hide that control, so you can
  hide the Player's own buttons and build your own.
- Inside a loop, `seek` and `goToBar` keep the playhead in the loop. Call
  `setLoop(null)` first to leave it.
- Browsers start sound only after the viewer has interacted with the page.
  On phones, the viewer has to tap inside the embed once before `play()`
  makes a sound.

## Events

```ts
import { Player, type PlayerState } from "@sound2score/player";

declare const player: Player;

function show(state: PlayerState): void {
	console.log(`bar ${state.bar} of ${state.bars}`, state.playing);
}

player.events.on("ready", show);
// At most 4 times a second, whenever what the Player shows changed.
player.events.on("change", show);
player.events.on("unavailable", ({ reason, resetsAt }) => {
	// "not-found": no such score, or it can't be embedded.
	// "site": this site isn't one the owner allows.
	// "capped": the owner reached their spending limit until resetsAt.
	// "busy": too many new viewers from one network, until resetsAt.
	console.log(reason, resetsAt === null ? null : new Date(resetsAt));
});
```

`PlayerState` holds `playing`, `seconds`, `duration`, `bar`, `bars`, `loop`,
`speed`, `semitones` and `metronome`. `player.getState()` returns the last
one, or null before `ready`.

Call `player.dispose()` to stop listening. The iframe stays on the page;
remove it yourself if you want it gone.

## What it can't do

These are deliberate:

- No `load(scoreId)`. To show another score, create a new Player.
- No printing, exporting or downloading the score or its recordings.
- No preloading recordings.
- `userId` is read only when the embed loads.

## Building URLs yourself

For a server-rendered page, `EmbedUrlBuilder` writes the same `src` that
`create` does:

```ts
import {
	DEFAULT_EMBED_OPTIONS,
	EmbedOptionsCodec,
	EmbedUrlBuilder,
} from "@sound2score/player";

const urls = new EmbedUrlBuilder(
	"https://sound2score.com",
	new EmbedOptionsCodec(),
);
const src = urls.build(
	"abc123",
	{
		...DEFAULT_EMBED_OPTIONS,
		start: { ...DEFAULT_EMBED_OPTIONS.start, speed: 70 },
	},
	"student-42",
);
```

Keep `allow="autoplay; fullscreen"` on the iframe so playback and fullscreen
work.
