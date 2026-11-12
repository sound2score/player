import type { BarRange } from "./embed-options";
import {
	type Command,
	type EmbedEvent,
	type EmbedMessage,
	type HostMessage,
	type PlayerState,
	PROTOCOL_TAG,
	type Unavailable,
	type UnavailableReason,
} from "./protocol";

type Fields = Readonly<Record<string, unknown>>;

const REASONS: readonly UnavailableReason[] = [
	"not-found",
	"site",
	"capped",
	"busy",
];

/**
 * Reads what arrives through postMessage, which any page can send, into a
 * message of this package's, or null when it is someone else's, malformed, or
 * a kind this version doesn't know.
 */
export class EmbedMessageReader {
	host(data: unknown): HostMessage | null {
		const envelope = this.envelope(data);
		const command = envelope && this.command(this.fields(envelope.command));
		return envelope && command
			? { tag: PROTOCOL_TAG, version: envelope.version, command }
			: null;
	}

	embed(data: unknown): EmbedMessage | null {
		const envelope = this.envelope(data);
		const event = envelope && this.event(this.fields(envelope.event));
		return envelope && event
			? { tag: PROTOCOL_TAG, version: envelope.version, event }
			: null;
	}

	private envelope(data: unknown): (Fields & { version: number }) | null {
		const fields = this.fields(data);
		if (fields?.tag !== PROTOCOL_TAG) {
			return null;
		}
		const version = fields.version;
		return typeof version === "number" &&
			Number.isInteger(version) &&
			version >= 1
			? { ...fields, version }
			: null;
	}

	private command(fields: Fields | null): Command | null {
		switch (fields?.kind) {
			case "hello":
			case "play":
			case "pause":
				return { kind: fields.kind };
			case "seek": {
				const seconds = this.number(fields.seconds);
				return seconds !== null && seconds >= 0
					? { kind: "seek", seconds }
					: null;
			}
			case "goToBar": {
				const bar = this.count(fields.bar);
				return bar !== null ? { kind: "goToBar", bar } : null;
			}
			case "setLoop": {
				if (fields.bars === null) {
					return { kind: "setLoop", bars: null };
				}
				const bars = this.bars(fields.bars);
				return bars ? { kind: "setLoop", bars } : null;
			}
			case "setSpeed": {
				const percent = this.number(fields.percent);
				return percent !== null ? { kind: "setSpeed", percent } : null;
			}
			case "setTranspose": {
				const semitones = this.number(fields.semitones);
				return semitones !== null && Number.isInteger(semitones)
					? { kind: "setTranspose", semitones }
					: null;
			}
			case "setMetronome":
				return typeof fields.on === "boolean"
					? { kind: "setMetronome", on: fields.on }
					: null;
			default:
				return null;
		}
	}

	private event(fields: Fields | null): EmbedEvent | null {
		switch (fields?.kind) {
			case "ready":
			case "change": {
				const state = this.state(this.fields(fields.state));
				return state ? { kind: fields.kind, state } : null;
			}
			case "unavailable": {
				const unavailable = this.unavailable(this.fields(fields.unavailable));
				return unavailable ? { kind: "unavailable", unavailable } : null;
			}
			default:
				return null;
		}
	}

	private state(fields: Fields | null): PlayerState | null {
		if (!fields) {
			return null;
		}
		const seconds = this.number(fields.seconds);
		const duration = this.number(fields.duration);
		const bar = this.count(fields.bar);
		const bars = this.number(fields.bars);
		const speed = this.number(fields.speed);
		const semitones = this.number(fields.semitones);
		const loop = fields.loop === null ? null : this.bars(fields.loop);
		if (
			typeof fields.playing !== "boolean" ||
			typeof fields.metronome !== "boolean" ||
			seconds === null ||
			duration === null ||
			bar === null ||
			bars === null ||
			speed === null ||
			semitones === null ||
			(fields.loop !== null && loop === null)
		) {
			return null;
		}
		return {
			playing: fields.playing,
			seconds,
			duration,
			bar,
			bars,
			loop,
			speed,
			semitones,
			metronome: fields.metronome,
		};
	}

	private unavailable(fields: Fields | null): Unavailable | null {
		const reason = REASONS.find((reason) => reason === fields?.reason);
		const resetsAt =
			fields?.resetsAt === null ? null : this.number(fields?.resetsAt);
		if (!reason || (fields?.resetsAt !== null && resetsAt === null)) {
			return null;
		}
		return { reason, resetsAt };
	}

	private bars(value: unknown): BarRange | null {
		const fields = this.fields(value);
		const from = this.count(fields?.from);
		const to = this.count(fields?.to);
		return from !== null && to !== null && to >= from ? { from, to } : null;
	}

	/** A whole number from 1, such as a bar. */
	private count(value: unknown): number | null {
		return typeof value === "number" && Number.isInteger(value) && value >= 1
			? value
			: null;
	}

	private number(value: unknown): number | null {
		return typeof value === "number" && Number.isFinite(value) ? value : null;
	}

	private fields(value: unknown): Fields | null {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Fields)
			: null;
	}
}
