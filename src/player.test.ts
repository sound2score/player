import { beforeEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { FakeEmbedFrame } from "./fake-embed-frame";
import { Player } from "./player";
import { type PlayerState, PROTOCOL_TAG } from "./protocol";

describe("Player", () => {
	let frame: FakeEmbedFrame;
	let player: Player;

	beforeEach(() => {
		frame = new FakeEmbedFrame();
		player = new Player(frame);
	});

	it("says hello to the embed", () => {
		expect(frame.sent()).toEqual([
			{ tag: PROTOCOL_TAG, version: 1, command: { kind: "hello" } },
		]);
	});

	it("holds commands until the embed is ready, then sends them in order", () => {
		player.goToBar(9);
		player.play();
		expect(kinds(frame)).toEqual(["hello"]);

		ready(frame);

		expect(kinds(frame)).toEqual(["hello", "goToBar", "play"]);
	});

	it("sends commands straight away once ready", () => {
		ready(frame);

		player.setLoop({ from: 5, to: 8 });

		expect(frame.sent().at(-1)?.command).toEqual({
			kind: "setLoop",
			bars: { from: 5, to: 8 },
		});
	});

	it("raises ready once, and change with each new state", () => {
		const heard: string[] = [];
		player.events.on("ready", () => heard.push("ready"));
		player.events.on("change", (state) => heard.push(`change ${state.bar}`));

		ready(frame);
		ready(frame);
		frame.receive({
			tag: PROTOCOL_TAG,
			version: 1,
			event: { kind: "change", state: { ...STATE, bar: 4 } },
		});

		expect(heard).toEqual(["ready", "change 4"]);
		expect(player.getState()?.bar).toBe(4);
	});

	it("drops commands once the embed can't play", () => {
		player.play();
		const reasons: string[] = [];
		player.events.on("unavailable", ({ reason }) => reasons.push(reason));

		frame.receive({
			tag: PROTOCOL_TAG,
			version: 1,
			event: {
				kind: "unavailable",
				unavailable: { reason: "capped", resetsAt: 1_800_000_000_000 },
			},
		});
		player.pause();

		expect(reasons).toEqual(["capped"]);
		expect(player.getUnavailable()?.reason).toBe("capped");
		expect(kinds(frame)).toEqual(["hello"]);
	});

	it("says hello again when the embed loads again, and waits for ready", () => {
		ready(frame);

		frame.load();
		player.play();

		expect(player.isReady()).toBe(false);
		expect(kinds(frame)).toEqual(["hello", "hello"]);
	});

	it("keeps values inside what the embed takes", () => {
		ready(frame);

		player.seek(-3);
		player.goToBar(0);
		player.setTranspose(2.4);

		expect(
			frame
				.sent()
				.slice(1)
				.map((message) => message.command),
		).toEqual([
			{ kind: "seek", seconds: 0 },
			{ kind: "goToBar", bar: 1 },
			{ kind: "setTranspose", semitones: 2 },
		]);
	});

	it("reports an upgrade refusal from the embed and logs the target version", () => {
		const guardedFrame = new FakeEmbedFrame();
		const errors: string[] = [];
		const guarded = new Player(guardedFrame, {
			onError: (message) => errors.push(message),
		});
		const reasons: Array<{ reason: string; upgradeTo?: string }> = [];
		guarded.events.on("unavailable", (unavailable) =>
			reasons.push({
				reason: unavailable.reason,
				upgradeTo: unavailable.upgradeTo,
			}),
		);
		guarded.play();

		guardedFrame.receive({
			tag: PROTOCOL_TAG,
			version: 2,
			event: {
				kind: "unavailable",
				unavailable: { reason: "upgrade", resetsAt: null, upgradeTo: "2.0.0" },
			},
		});

		expect(reasons).toEqual([{ reason: "upgrade", upgradeTo: "2.0.0" }]);
		expect(guarded.isReady()).toBe(false);
		expect(guarded.getUnavailable()).toEqual({
			reason: "upgrade",
			resetsAt: null,
			upgradeTo: "2.0.0",
		});
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("@sound2score/player@2.0.0");
		guarded.dispose();
	});

	it("logs a latest upgrade hint when the embed omits upgradeTo", () => {
		const guardedFrame = new FakeEmbedFrame();
		const errors: string[] = [];
		const guarded = new Player(guardedFrame, {
			onError: (message) => errors.push(message),
		});

		guardedFrame.receive({
			tag: PROTOCOL_TAG,
			version: 2,
			event: {
				kind: "unavailable",
				unavailable: { reason: "upgrade", resetsAt: null },
			},
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("@sound2score/player@latest");
		guarded.dispose();
	});

	it("refuses with upgrade when the embed speaks an older protocol version", () => {
		const newerFrame = new FakeEmbedFrame();
		const errors: string[] = [];
		const newer = new Player(newerFrame, {
			protocolVersion: 2,
			onError: (message) => errors.push(message),
		});
		const events: string[] = [];
		newer.events.on("ready", () => events.push("ready"));
		newer.events.on("change", () => events.push("change"));
		newer.events.on("unavailable", ({ reason }) =>
			events.push(`unavailable:${reason}`),
		);
		newer.play();

		newerFrame.receive({
			tag: PROTOCOL_TAG,
			version: 1,
			event: { kind: "ready", state: STATE },
		});
		newerFrame.receive({
			tag: PROTOCOL_TAG,
			version: 1,
			event: { kind: "change", state: { ...STATE, bar: 2 } },
		});

		expect(newer.isReady()).toBe(false);
		expect(newer.getUnavailable()).toEqual({
			reason: "upgrade",
			resetsAt: null,
		});
		expect(events).toEqual(["unavailable:upgrade"]);
		expect(kinds(newerFrame)).toEqual(["hello"]);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("protocol version 1");
		expect(errors[0]).toContain("protocol version 2");
		newer.dispose();
	});

	it("lets go of the embed when disposed", () => {
		player.dispose();

		expect(frame.isDisposed()).toBe(true);
	});

	it("creates an embed of the score in the container", async () => {
		const dom = new Window({
			url: "https://school.example/lesson",
			settings: { disableIframePageLoading: true },
		});
		const container = dom.document.createElement("div");
		dom.document.body.append(container);

		const created = Player.create(container as unknown as HTMLElement, {
			scoreId: "abc123",
			userId: "student-42",
			height: 400,
		});

		const iframe = container.querySelector("iframe");
		expect(iframe?.getAttribute("src")).toBe(
			"https://sound2score.com/s/abc123/embed?u=student-42",
		);
		expect(iframe?.getAttribute("height")).toBe("400");
		expect(iframe?.getAttribute("allow")).toBe("autoplay; fullscreen");
		created.dispose();
		await dom.happyDOM.close();
	});
});

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

function ready(frame: FakeEmbedFrame, state = STATE): void {
	frame.receive({
		tag: PROTOCOL_TAG,
		version: 1,
		event: { kind: "ready", state },
	});
}

function kinds(frame: FakeEmbedFrame): string[] {
	return frame.sent().map((message) => message.command.kind);
}
