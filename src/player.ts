import { Disposer, type Resource } from "core/disposable";
import { Dispatcher, type Eventful, type Events } from "core/events";
import type { EmbedFrame } from "./embed-frame";
import { EmbedMessageReader } from "./embed-message-reader";
import {
	type BarRange,
	DEFAULT_EMBED_OPTIONS,
	type EmbedControls,
	type EmbedLayout,
	type EmbedLook,
	type EmbedOptions,
	type EmbedStart,
} from "./embed-options";
import { EmbedOptionsCodec } from "./embed-options-codec";
import { EmbedUrlBuilder } from "./embed-url-builder";
import { IframeEmbedFrame } from "./iframe-embed-frame";
import {
	type Command,
	type EmbedMessage,
	type PlayerState,
	PROTOCOL_TAG,
	PROTOCOL_VERSION,
	type Unavailable,
} from "./protocol";

export type PlayerEvents = {
	/** The score loaded and takes commands. */
	ready: PlayerState;
	/** What the Player shows changed, at most 4 times a second. */
	change: PlayerState;
	/** The embed can't play here, and why. */
	unavailable: Unavailable;
};

/** The options an embed starts with. Anything left out keeps its default. */
export type PlayerOptions = Readonly<{
	controls?: Partial<EmbedControls>;
	start?: Partial<EmbedStart>;
	layout?: Partial<EmbedLayout>;
	look?: Partial<EmbedLook>;
}>;

export type CreateOptions = Readonly<{
	/** The score's ID, from its address: `sound2score.com/s/<scoreId>`. */
	scoreId: string;
	/**
	 * The ID your site knows the viewer by, so each of your students counts
	 * once however many browsers they use. Leave it out and each browser counts.
	 */
	userId?: string;
	options?: PlayerOptions;
	/** The iframe's title, which screen readers announce. */
	title?: string;
	/** The iframe's height in CSS pixels; 520 by default. Its width fills the container. */
	height?: number;
	/** Where sound2score is served from; `https://sound2score.com` by default. */
	origin?: string;
}>;

/** Optional runtime settings for a Player instance. */
export type PlayerConfig = Readonly<{
	protocolVersion?: number;
	onError?: (message: string) => void;
}>;

const DEFAULT_ORIGIN = "https://sound2score.com";

/**
 * A sound2score score embedded on your page, which your page can play, pause,
 * seek, loop, slow down, transpose and click along to, and hear back from.
 *
 * Commands given before the score is ready wait and run in order once it is.
 * An embed that can't play drops them and raises `unavailable`.
 */
export class Player implements Eventful<PlayerEvents>, Resource {
	private readonly dispatcher = new Dispatcher<PlayerEvents>();
	private readonly disposer = new Disposer();
	private readonly protocolVersion: number;
	private readonly onError: (message: string) => void;
	private state: PlayerState | null = null;
	private ready = false;
	private unavailable: Unavailable | null = null;
	private upgradeLogged = false;
	private waiting: Command[] = [];

	/** Adds an embed of a score to `container`, filling its width. */
	static create(container: HTMLElement, opts: CreateOptions): Player {
		const origin = opts.origin ?? DEFAULT_ORIGIN;
		const document = container.ownerDocument;
		const iframe = document.createElement("iframe");
		iframe.src = new EmbedUrlBuilder(origin, new EmbedOptionsCodec()).build(
			opts.scoreId,
			Player.options(opts.options ?? {}),
			opts.userId ?? null,
		);
		iframe.width = "100%";
		iframe.height = String(opts.height ?? 520);
		// An unset color scheme lets a transparent embed show your page through it.
		iframe.style.border = "0";
		iframe.style.colorScheme = "normal";
		iframe.allow = "autoplay; fullscreen";
		iframe.title = opts.title ?? "Score on sound2score";
		container.append(iframe);
		return Player.frame(iframe, new URL(origin).origin);
	}

	/** Takes control of an embed already on the page, such as one pasted from sound2score. */
	static attach(iframe: HTMLIFrameElement): Player {
		return Player.frame(iframe, new URL(iframe.src).origin);
	}

	private static frame(iframe: HTMLIFrameElement, origin: string): Player {
		const window = iframe.ownerDocument.defaultView;
		if (!window) {
			throw new Error("The iframe must be in a document with a window.");
		}
		return new Player(
			new IframeEmbedFrame(iframe, window, origin, new EmbedMessageReader()),
		);
	}

	private static options(opts: PlayerOptions): EmbedOptions {
		return {
			controls: { ...DEFAULT_EMBED_OPTIONS.controls, ...opts.controls },
			start: { ...DEFAULT_EMBED_OPTIONS.start, ...opts.start },
			layout: { ...DEFAULT_EMBED_OPTIONS.layout, ...opts.layout },
			look: { ...opts.look },
		};
	}

	constructor(
		private readonly frame: EmbedFrame,
		config?: PlayerConfig,
	) {
		this.protocolVersion = config?.protocolVersion ?? PROTOCOL_VERSION;
		this.onError = config?.onError ?? ((message) => console.error(message));
		this.disposer.use(this.dispatcher);
		this.disposer.use(frame);
		this.disposer.defer(
			frame.events.on("message", (message) => this.receive(message)),
		);
		this.disposer.defer(frame.events.on("load", () => this.loaded()));
		this.send({ kind: "hello" });
	}

	get events(): Events<PlayerEvents> {
		return this.dispatcher.events;
	}

	/** What the Player last showed, or null until it is ready. */
	getState(): PlayerState | null {
		return this.state;
	}

	isReady(): boolean {
		return this.ready;
	}

	/** Why the embed can't play, or null while it can. */
	getUnavailable(): Unavailable | null {
		return this.unavailable;
	}

	/**
	 * Plays from where the playhead is. Browsers let sound start only after
	 * the viewer has interacted with the page, and on phones only after they
	 * tap inside the embed.
	 */
	play(): void {
		this.command({ kind: "play" });
	}

	pause(): void {
		this.command({ kind: "pause" });
	}

	/** Moves the playhead to `seconds` from the start, staying inside a loop. */
	seek(seconds: number): void {
		this.command({ kind: "seek", seconds: Math.max(0, seconds) });
	}

	/** Moves the playhead to the start of a bar, counted from 1. */
	goToBar(bar: number): void {
		this.command({ kind: "goToBar", bar: Math.max(1, Math.round(bar)) });
	}

	/** Loops from the first bar through the last, both counted from 1, or stops looping. */
	setLoop(bars: BarRange | null): void {
		this.command({ kind: "setLoop", bars });
	}

	/** Sets the speed in percent of the written tempo, from 25 to 200. */
	setSpeed(percent: number): void {
		this.command({ kind: "setSpeed", percent });
	}

	/** Transposes the score, from -12 to 12 semitones. */
	setTranspose(semitones: number): void {
		this.command({ kind: "setTranspose", semitones: Math.round(semitones) });
	}

	setMetronome(on: boolean): void {
		this.command({ kind: "setMetronome", on });
	}

	/** Stops listening to the embed. The iframe stays on the page. */
	dispose(): void {
		this.disposer.dispose();
		this.waiting = [];
	}

	private command(command: Command): void {
		if (this.ready) {
			this.send(command);
		} else if (!this.unavailable) {
			this.waiting.push(command);
		}
	}

	private send(command: Command): void {
		this.frame.post({
			tag: PROTOCOL_TAG,
			version: this.protocolVersion,
			command,
		});
	}

	private receive({ version, event }: EmbedMessage): void {
		if (
			event.kind === "unavailable" &&
			event.unavailable.reason === "upgrade"
		) {
			this.rejectUpgrade(
				event.unavailable,
				event.unavailable.upgradeTo
					? `@sound2score/player: This version is no longer supported by the embed. Upgrade to @sound2score/player@${event.unavailable.upgradeTo} or later (npm install @sound2score/player@${event.unavailable.upgradeTo}).`
					: "@sound2score/player: This version is no longer supported by the embed. Upgrade to the latest @sound2score/player (npm install @sound2score/player@latest).",
			);
			return;
		}
		if (version < this.protocolVersion) {
			if (this.unavailable?.reason === "upgrade") {
				return;
			}
			this.rejectUpgrade(
				{ reason: "upgrade", resetsAt: null },
				`@sound2score/player: The embed speaks protocol version ${version}, which is older than this package's protocol version ${this.protocolVersion}. Wait for the embed to update or install a matching version of @sound2score/player.`,
			);
			return;
		}
		switch (event.kind) {
			case "ready": {
				this.state = event.state;
				this.unavailable = null;
				const first = !this.ready;
				this.ready = true;
				if (first) {
					const waiting = this.waiting;
					this.waiting = [];
					for (const command of waiting) {
						this.send(command);
					}
					this.dispatcher.dispatch("ready", event.state);
				}
				return;
			}
			case "change":
				this.state = event.state;
				this.dispatcher.dispatch("change", event.state);
				return;
			case "unavailable":
				this.ready = false;
				this.waiting = [];
				this.unavailable = event.unavailable;
				this.dispatcher.dispatch("unavailable", event.unavailable);
				return;
		}
	}

	private rejectUpgrade(unavailable: Unavailable, message: string): void {
		this.ready = false;
		this.waiting = [];
		this.unavailable = unavailable;
		if (!this.upgradeLogged) {
			this.upgradeLogged = true;
			this.onError(message);
		}
		this.dispatcher.dispatch("unavailable", unavailable);
	}

	/** A page loading again starts over, so the Player asks again whether it is ready. */
	private loaded(): void {
		this.ready = false;
		this.unavailable = null;
		this.upgradeLogged = false;
		this.send({ kind: "hello" });
	}
}
