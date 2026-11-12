# @sound2score/player

Put [sound2score](https://sound2score.com) sheet music on your site and
control it from your page: play, pause, seek, loop bars, change the speed,
transpose and click along, and hear back what the Player is doing.

```sh
npm install @sound2score/player
```

Building with an AI coding agent? Give it the Player's skill:

```sh
npx skills add sound2score/player
```

## Quick start

```ts
import { Player } from "@sound2score/player";

const container = document.getElementById("score");
if (!container) {
	throw new Error("No #score element");
}
const player = Player.create(container, {
	scoreId: "abc123",
	userId: "student-42",
	options: { start: { speed: 80 } },
});

player.events.on("ready", () => {
	player.setLoop({ from: 9, to: 16 });
	player.play();
});
player.events.on("change", (state) => {
	console.log(`bar ${state.bar} of ${state.bars}`);
});
```

The score's owner has to add your site to the sites in their Embeds settings
on sound2score first. The score ID is the last part of the score's address,
`sound2score.com/s/<scoreId>`.

Already have an iframe pasted from sound2score? Take control of it:

```ts
import { Player } from "@sound2score/player";

const iframe = document.querySelector<HTMLIFrameElement>("iframe");
if (iframe) {
	Player.attach(iframe).play();
}
```

## Commands

| Command | What it does |
| --- | --- |
| `play()` / `pause()` | Starts and stops playback. Phones need one tap inside the embed before sound plays. |
| `seek(seconds)` | Moves the playhead, staying inside a loop. |
| `goToBar(bar)` | Moves to the start of a bar, counted from 1 in playback order. |
| `setLoop({ from, to })` / `setLoop(null)` | Loops bars, both included, or stops looping. |
| `setSpeed(percent)` | 25 to 200 percent of the written tempo. |
| `setTranspose(semitones)` | -12 to 12 from as written. |
| `setMetronome(on)` | Turns the click on or off. |

Commands given before the score is ready wait, then run in order. They
work even when the embed's options hide that control.

## Events

- `ready(state)`: the score loaded and takes commands.
- `change(state)`: what the Player shows changed, at most 4 times a second.
- `unavailable({ reason, resetsAt })`: the embed can't play. `reason` is
  `not-found`, `site` (your site isn't allowed), `capped` (the owner's
  spending limit, until `resetsAt`) or `busy` (too many new viewers from one
  network, until `resetsAt`).

## Students

Each viewer of an embed counts as one of the score owner's students. Pass
`userId`, the ID your site knows the viewer by, so a student counts once
however many browsers they use. It is read once, when the embed loads.

## What it can't do

No loading another score into the same Player (create a new one), no
printing or exporting, and no preloading recordings.

## License

MIT
