import {
	APPEARANCES,
	type BarRange,
	type ControlMode,
	DEFAULT_EMBED_OPTIONS,
	type EmbedControls,
	type EmbedLayout,
	type EmbedLook,
	type EmbedOptions,
	type EmbedStart,
	type InitialLayout,
	MAX_SEMITONES,
	MAX_SPEED,
	MIN_SPEED,
	THEMES,
	type VideoPlacement,
} from "./embed-options";

const HEX = /^[0-9a-f]{6}$/;
const CONTROLS = Object.keys(
	DEFAULT_EMBED_OPTIONS.controls,
) as (keyof EmbedControls)[];
const MODES: Readonly<Record<keyof EmbedControls, readonly ControlMode[]>> = {
	tempo: ["off", "on"],
	metronome: ["off", "on"],
	loop: ["off", "on"],
	transpose: ["off", "on"],
	fullscreen: ["off", "on"],
	mixer: ["off", "on", "open"],
	fretboard: ["off", "on", "open"],
	piano: ["off", "on", "open"],
};
const PLACEMENTS: readonly VideoPlacement[] = ["beside", "above"];
/** Each initial layout by its URL value. */
const INITIALS = {
	video: "video",
	line: "firstLine",
	score: "score",
} as const satisfies Record<string, InitialLayout>;
const INITIAL_VALUES = Object.keys(INITIALS) as (keyof typeof INITIALS)[];
const CREDITS: readonly EmbedLook["credit"][] = ["header", "corner", "hidden"];

/**
 * An embed's options as URL options and back, so an embed stays a plain
 * iframe: `?mixer=open&speed=70&bars=9-16&accent=ff00aa`.
 * Defaults are left out, and a value it cannot read falls back to the
 * default rather than breaking the embed.
 */
export class EmbedOptionsCodec {
	encode(opts: EmbedOptions): URLSearchParams {
		const params = new URLSearchParams();
		const defaults = DEFAULT_EMBED_OPTIONS;
		for (const control of CONTROLS) {
			if (opts.controls[control] !== defaults.controls[control]) {
				params.set(control, opts.controls[control]);
			}
		}
		const { start, layout, look } = opts;
		if (start.speed !== defaults.start.speed) {
			params.set("speed", String(start.speed));
		}
		if (start.semitones !== defaults.start.semitones) {
			params.set("semitones", String(start.semitones));
		}
		if (start.metronome) {
			params.set("click", "1");
		}
		if (start.bars) {
			params.set("bars", `${start.bars.from}-${start.bars.to}`);
		} else if (start.bar !== null) {
			params.set("bar", String(start.bar));
		}
		if (!layout.title) {
			params.set("title", "0");
		}
		if (layout.video !== defaults.layout.video) {
			params.set("video", layout.video);
		}
		if (layout.initial !== defaults.layout.initial) {
			params.set("initial", layout.initial === "firstLine" ? "line" : "score");
		}
		if (look.appearance) {
			params.set("appearance", look.appearance);
		}
		if (look.theme) {
			params.set("theme", look.theme);
		}
		if (look.accent) {
			params.set("accent", look.accent.slice(1));
		}
		if (look.background) {
			params.set(
				"bg",
				look.background === "transparent"
					? "transparent"
					: look.background.slice(1),
			);
		}
		if (look.credit) {
			params.set("credit", look.credit);
		}
		return params;
	}

	decode(params: URLSearchParams): EmbedOptions {
		return {
			controls: this.controls(params),
			start: this.start(params),
			layout: this.layout(params),
			look: this.look(params),
		};
	}

	private controls(params: URLSearchParams): EmbedControls {
		const controls: Record<string, ControlMode> = {
			...DEFAULT_EMBED_OPTIONS.controls,
		};
		for (const control of CONTROLS) {
			const mode = this.oneOf(params.get(control), MODES[control]);
			if (mode) {
				controls[control] = mode;
			}
		}
		return controls as EmbedControls;
	}

	private start(params: URLSearchParams): EmbedStart {
		const bars = this.bars(params.get("bars"));
		return {
			speed:
				this.integer(params.get("speed"), MIN_SPEED, MAX_SPEED) ??
				DEFAULT_EMBED_OPTIONS.start.speed,
			semitones:
				this.integer(params.get("semitones"), -MAX_SEMITONES, MAX_SEMITONES) ??
				0,
			metronome: params.get("click") === "1",
			bars,
			bar: bars ? null : this.integer(params.get("bar"), 1, Infinity),
		};
	}

	private layout(params: URLSearchParams): EmbedLayout {
		return {
			title: params.get("title") !== "0",
			video:
				this.oneOf(params.get("video"), PLACEMENTS) ??
				DEFAULT_EMBED_OPTIONS.layout.video,
			initial: this.initial(params),
		};
	}

	/** `initial` names it; older snippets folded the video with `collapse=1`. */
	private initial(params: URLSearchParams): InitialLayout {
		const initial = this.oneOf(params.get("initial"), INITIAL_VALUES);
		if (initial) {
			return INITIALS[initial];
		}
		return params.get("collapse") === "1"
			? "score"
			: DEFAULT_EMBED_OPTIONS.layout.initial;
	}

	private look(params: URLSearchParams): Partial<EmbedLook> {
		const look: {
			-readonly [K in keyof EmbedLook]?: EmbedLook[K];
		} = {};
		const appearance = this.oneOf(params.get("appearance"), APPEARANCES);
		if (appearance) {
			look.appearance = appearance;
		}
		const theme = this.oneOf(params.get("theme"), THEMES);
		if (theme) {
			look.theme = theme;
		}
		const accent = this.hex(params.get("accent"));
		if (accent) {
			look.accent = accent;
		}
		const background = params.get("bg");
		if (background === "transparent") {
			look.background = "transparent";
		} else if (this.hex(background)) {
			look.background = this.hex(background);
		}
		const credit = this.oneOf(params.get("credit"), CREDITS);
		if (credit) {
			look.credit = credit;
		}
		return look;
	}

	private bars(value: string | null): BarRange | null {
		const match = value?.match(/^(\d+)-(\d+)$/);
		if (!match) {
			return null;
		}
		const from = Number(match[1]);
		const to = Number(match[2]);
		return from >= 1 && to >= from ? { from, to } : null;
	}

	private integer(value: string | null, min: number, max: number) {
		if (value === null || !/^-?\d+$/.test(value)) {
			return null;
		}
		const number = Number(value);
		return number >= min && number <= max ? number : null;
	}

	private hex(value: string | null): string | null {
		const lower = value?.toLowerCase() ?? "";
		return HEX.test(lower) ? `#${lower}` : null;
	}

	private oneOf<T extends string>(
		value: string | null,
		options: readonly T[],
	): T | null {
		return options.find((option) => option === value) ?? null;
	}
}
