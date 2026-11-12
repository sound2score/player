import { describe, expect, it } from "bun:test";
import { FakeEmbedFrame } from "./fake-embed-frame";
import { PROTOCOL_TAG } from "./protocol";

describe("FakeEmbedFrame", () => {
	it("keeps what was posted", () => {
		const frame = new FakeEmbedFrame();
		const message = {
			tag: PROTOCOL_TAG,
			version: 1,
			command: { kind: "play" },
		} as const;

		frame.post(message);

		expect(frame.sent()).toEqual([message]);
	});

	it("delivers what the embed posts, and loads", () => {
		const frame = new FakeEmbedFrame();
		const heard: string[] = [];
		frame.events.on("message", (message) => heard.push(message.event.kind));
		frame.events.on("load", () => heard.push("load"));

		frame.load();
		frame.receive({
			tag: PROTOCOL_TAG,
			version: 1,
			event: {
				kind: "unavailable",
				unavailable: { reason: "site", resetsAt: null },
			},
		});

		expect(heard).toEqual(["load", "unavailable"]);
	});

	it("is disposed once", () => {
		const frame = new FakeEmbedFrame();

		frame.dispose();

		expect(frame.isDisposed()).toBe(true);
	});
});
