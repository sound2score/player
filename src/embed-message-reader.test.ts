import { describe, expect, it } from "bun:test";
import { EmbedMessageReader } from "./embed-message-reader";
import {
	type EmbedMessage,
	type HostMessage,
	type PlayerState,
	PROTOCOL_TAG,
} from "./protocol";

const reader = new EmbedMessageReader();

const STATE: PlayerState = {
	playing: false,
	seconds: 0,
	duration: 90,
	bar: 1,
	bars: 32,
	loop: null,
	speed: 100,
	semitones: 0,
	metronome: false,
};

describe("EmbedMessageReader", () => {
	it("reads a command", () => {
		const message: HostMessage = {
			tag: PROTOCOL_TAG,
			version: 1,
			command: { kind: "setLoop", bars: { from: 9, to: 16 } },
		};

		expect(reader.host(message)).toEqual(message);
	});

	it("drops what another script posted", () => {
		expect(reader.host({ kind: "play" })).toBeNull();
		expect(reader.host("play")).toBeNull();
		expect(reader.host(null)).toBeNull();
	});

	it("drops a message without a version", () => {
		expect(
			reader.host({ tag: PROTOCOL_TAG, command: { kind: "play" } }),
		).toBeNull();
	});

	it("drops a command this version doesn't know", () => {
		expect(
			reader.host({ tag: PROTOCOL_TAG, version: 2, command: { kind: "load" } }),
		).toBeNull();
	});

	it("drops a command whose values are out of range", () => {
		const command = (command: object) =>
			reader.host({ tag: PROTOCOL_TAG, version: 1, command });

		expect(command({ kind: "seek", seconds: -1 })).toBeNull();
		expect(command({ kind: "goToBar", bar: 0 })).toBeNull();
		expect(command({ kind: "setLoop", bars: { from: 4, to: 2 } })).toBeNull();
		expect(command({ kind: "setSpeed", percent: Number.NaN })).toBeNull();
		expect(command({ kind: "setTranspose", semitones: 1.5 })).toBeNull();
		expect(command({ kind: "setMetronome", on: "yes" })).toBeNull();
	});

	it("keeps only the fields a command has", () => {
		expect(
			reader.host({
				tag: PROTOCOL_TAG,
				version: 1,
				command: { kind: "play", extra: true },
			}),
		).toEqual({ tag: PROTOCOL_TAG, version: 1, command: { kind: "play" } });
	});

	it("reads an event", () => {
		const message: EmbedMessage = {
			tag: PROTOCOL_TAG,
			version: 1,
			event: { kind: "ready", state: STATE },
		};

		expect(reader.embed(message)).toEqual(message);
	});

	it("drops a state missing a field", () => {
		const { metronome: _, ...state } = STATE;

		expect(
			reader.embed({
				tag: PROTOCOL_TAG,
				version: 1,
				event: { kind: "change", state },
			}),
		).toBeNull();
	});

	it("reads why an embed can't play", () => {
		const message: EmbedMessage = {
			tag: PROTOCOL_TAG,
			version: 1,
			event: {
				kind: "unavailable",
				unavailable: { reason: "capped", resetsAt: 1_800_000_000_000 },
			},
		};

		expect(reader.embed(message)).toEqual(message);
	});

	it("drops a reason it doesn't know", () => {
		expect(
			reader.embed({
				tag: PROTOCOL_TAG,
				version: 1,
				event: {
					kind: "unavailable",
					unavailable: { reason: "gone", resetsAt: null },
				},
			}),
		).toBeNull();
	});
});
