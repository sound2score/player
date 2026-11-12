import { Dispatcher, type Events } from "core/events";
import type { EmbedFrame, EmbedFrameEvents } from "./embed-frame";
import type { EmbedMessage, HostMessage } from "./protocol";

/** An embed in memory, for testing code that drives a Player. */
export class FakeEmbedFrame implements EmbedFrame {
	private readonly dispatcher = new Dispatcher<EmbedFrameEvents>();
	private readonly posted: HostMessage[] = [];
	private disposed = false;

	get events(): Events<EmbedFrameEvents> {
		return this.dispatcher.events;
	}

	post(message: HostMessage): void {
		this.posted.push(message);
	}

	dispose(): void {
		this.disposed = true;
		this.dispatcher.dispose();
	}

	/** Every message posted to the embed, in order. */
	sent(): readonly HostMessage[] {
		return [...this.posted];
	}

	/** Delivers a message as if the embed posted it. */
	receive(message: EmbedMessage): void {
		this.dispatcher.dispatch("message", message);
	}

	/** Acts as if the embed's page loaded. */
	load(): void {
		this.dispatcher.dispatch("load");
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
