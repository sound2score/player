import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Window } from "happy-dom";
import { EmbedMessageReader } from "./embed-message-reader";
import { IframeEmbedFrame } from "./iframe-embed-frame";
import { type EmbedMessage, PROTOCOL_TAG } from "./protocol";

const ORIGIN = "https://sound2score.com";

const READY: EmbedMessage = {
	tag: PROTOCOL_TAG,
	version: 1,
	event: {
		kind: "unavailable",
		unavailable: { reason: "site", resetsAt: null },
	},
};

describe("IframeEmbedFrame", () => {
	let dom: Window;
	let iframe: HTMLIFrameElement;
	let frame: IframeEmbedFrame;
	let heard: EmbedMessage[];

	beforeEach(() => {
		dom = new Window({ url: "https://school.example/lesson" });
		iframe = dom.document.createElement(
			"iframe",
		) as unknown as HTMLIFrameElement;
		dom.document.body.append(iframe as never);
		frame = new IframeEmbedFrame(
			iframe,
			dom as unknown as globalThis.Window,
			ORIGIN,
			new EmbedMessageReader(),
		);
		heard = [];
		frame.events.on("message", (message) => heard.push(message));
	});

	afterEach(async () => {
		frame.dispose();
		await dom.happyDOM.close();
	});

	function deliver(data: unknown, origin: string, source: unknown): void {
		dom.dispatchEvent(
			new dom.MessageEvent("message", {
				data,
				origin,
				source: source as never,
			}),
		);
	}

	it("hears its embed at sound2score's origin", () => {
		deliver(READY, ORIGIN, iframe.contentWindow);

		expect(heard).toEqual([READY]);
	});

	it("ignores another origin", () => {
		deliver(READY, "https://evil.example", iframe.contentWindow);

		expect(heard).toEqual([]);
	});

	it("ignores another frame", () => {
		deliver(READY, ORIGIN, dom);

		expect(heard).toEqual([]);
	});

	it("ignores what isn't a message of its own", () => {
		deliver({ kind: "ready" }, ORIGIN, iframe.contentWindow);

		expect(heard).toEqual([]);
	});

	it("raises load when the embed's page loads", () => {
		let loads = 0;
		frame.events.on("load", () => loads++);

		iframe.dispatchEvent(new dom.Event("load") as unknown as Event);

		expect(loads).toBe(1);
	});

	it("stops hearing once disposed", () => {
		frame.dispose();

		deliver(READY, ORIGIN, iframe.contentWindow);

		expect(heard).toEqual([]);
	});
});
