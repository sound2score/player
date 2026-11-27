import type { BarRange } from "./embed-options";

/**
 * The version of the messages this package speaks. Every message carries it,
 * and an embed answers in the version its page spoke, so a page keeps working
 * with the copy of this package it was built with.
 */
export const PROTOCOL_VERSION = 1;

/**
 * The oldest protocol version the embed still answers. A page speaking an
 * older version receives an `unavailable` event with reason `"upgrade"`.
 */
export const MIN_PROTOCOL_VERSION = 1;

/**
 * The oldest `@sound2score/player` package version that speaks at least
 * `MIN_PROTOCOL_VERSION`.
 */
export const MIN_PLAYER_VERSION = "0.0.3";

/** Marks a message as an embed's, among everything else a page posts. */
export const PROTOCOL_TAG = "sound2score-player";

/** What the Player is showing. */
export type PlayerState = Readonly<{
	playing: boolean;
	/** Where playback is, in seconds from the start. */
	seconds: number;
	/** How long the score plays, in seconds. */
	duration: number;
	/** The bar playback is in, counted from 1. */
	bar: number;
	/** How many bars the score has. */
	bars: number;
	/** The bars looping, or null. */
	loop: BarRange | null;
	/** Percent of the written tempo. */
	speed: number;
	/** How far the score is transposed, in semitones. */
	semitones: number;
	metronome: boolean;
}>;

/** Why an embed can't play. */
export type UnavailableReason =
	/** No such score, or it isn't one its owner lets you embed. */
	| "not-found"
	/** Your site isn't one the score's owner allows. */
	| "site"
	/** The owner has reached their spending limit until `resetsAt`. */
	| "capped"
	/** Too many new viewers came from one network, until `resetsAt`. */
	| "busy"
	/** This copy of `@sound2score/player` and the embed speak incompatible protocol versions. */
	| "upgrade";

export type Unavailable = Readonly<{
	reason: UnavailableReason;
	/** When it can play again, in milliseconds since the epoch, or null. */
	resetsAt: number | null;
	/** The `@sound2score/player` version to install when `reason` is `"upgrade"`. */
	upgradeTo?: string;
}>;

/** What your page asks the embed to do. */
export type Command =
	| Readonly<{ kind: "hello" }>
	| Readonly<{ kind: "play" }>
	| Readonly<{ kind: "pause" }>
	| Readonly<{ kind: "seek"; seconds: number }>
	| Readonly<{ kind: "goToBar"; bar: number }>
	| Readonly<{ kind: "setLoop"; bars: BarRange | null }>
	| Readonly<{ kind: "setSpeed"; percent: number }>
	| Readonly<{ kind: "setTranspose"; semitones: number }>
	| Readonly<{ kind: "setMetronome"; on: boolean }>;

/** What the embed tells your page. */
export type EmbedEvent =
	| Readonly<{ kind: "ready"; state: PlayerState }>
	| Readonly<{ kind: "change"; state: PlayerState }>
	| Readonly<{ kind: "unavailable"; unavailable: Unavailable }>;

/** A message from your page to the embed. */
export type HostMessage = Readonly<{
	tag: typeof PROTOCOL_TAG;
	version: number;
	command: Command;
}>;

/** A message from the embed to your page. */
export type EmbedMessage = Readonly<{
	tag: typeof PROTOCOL_TAG;
	version: number;
	event: EmbedEvent;
}>;
