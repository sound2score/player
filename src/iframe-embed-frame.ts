import type { Resource } from "core/disposable";
import { Dispatcher, type Events } from "core/events";
import type { EmbedFrame, EmbedFrameEvents } from "./embed-frame";
import type { EmbedMessageReader } from "./embed-message-reader";
import type { HostMessage } from "./protocol";

/**
 * An embed in an iframe on your page. It posts only to sound2score's origin,
 * so nothing reaches a page the iframe was sent to instead, and it hears only
 * messages from that iframe at that origin.
 */
export class IframeEmbedFrame implements EmbedFrame, Resource {
	private readonly dispatcher = new Dispatcher<EmbedFrameEvents>();

	constructor(
		private readonly iframe: HTMLIFrameElement,
		private readonly window: Window,
		private readonly origin: string,
		private readonly reader: EmbedMessageReader,
	) {
		this.window.addEventListener("message", this.receive);
		this.iframe.addEventListener("load", this.loaded);
	}

	get events(): Events<EmbedFrameEvents> {
		return this.dispatcher.events;
	}

	post(message: HostMessage): void {
		this.iframe.contentWindow?.postMessage(message, this.origin);
	}

	dispose(): void {
		this.window.removeEventListener("message", this.receive);
		this.iframe.removeEventListener("load", this.loaded);
		this.dispatcher.dispose();
	}

	private readonly receive = (event: MessageEvent): void => {
		if (
			event.origin !== this.origin ||
			event.source === null ||
			event.source !== this.iframe.contentWindow
		) {
			return;
		}
		const message = this.reader.embed(event.data);
		if (message) {
			this.dispatcher.dispatch("message", message);
		}
	};

	private readonly loaded = (): void => {
		this.dispatcher.dispatch("load");
	};
}
