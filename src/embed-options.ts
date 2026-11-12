/** Light, dark, or following the viewer's system. */
export type Appearance = "auto" | "light" | "dark";

/** The color themes an embed can take. */
export type Theme = "neon" | "volt" | "electric" | "plasma";

export const APPEARANCES: readonly Appearance[] = ["auto", "light", "dark"];

export const THEMES: readonly Theme[] = ["neon", "volt", "electric", "plasma"];

/** How an embed looks. Each field left out follows the score owner's style. */
export type EmbedLook = Readonly<{
	appearance: Appearance;
	theme: Theme;
	/** Replaces the theme's accent, as `#rrggbb`. */
	accent: string | null;
	/** Replaces the page color, as `#rrggbb`, or lets your page show through. */
	background: "transparent" | string | null;
	/** Where the link back to sound2score sits, or `hidden` to remove it. */
	credit: "header" | "corner" | "hidden";
}>;

/** Everything one embed sets. Look fields it leaves out follow the owner's style. */
export type EmbedOptions = Readonly<{
	controls: EmbedControls;
	start: EmbedStart;
	layout: EmbedLayout;
	look: Partial<EmbedLook>;
}>;

/** Off hides a control, on offers it, open also opens it when the page loads. */
export type ControlMode = "off" | "on" | "open";

/** Which controls an embed offers, from the transport and the Settings panel. */
export type EmbedControls = Readonly<{
	tempo: "off" | "on";
	/** The metronome and its count-in. */
	metronome: "off" | "on";
	loop: "off" | "on";
	transpose: "off" | "on";
	fullscreen: "off" | "on";
	mixer: ControlMode;
	fretboard: ControlMode;
	piano: ControlMode;
}>;

/** A loop from the first bar through the last, both counted from 1. */
export type BarRange = Readonly<{ from: number; to: number }>;

/** How playback starts. */
export type EmbedStart = Readonly<{
	/** Percent of the written tempo, 25 to 200. */
	speed: number;
	/** -12 to 12. */
	semitones: number;
	metronome: boolean;
	/** A loop already set. */
	bars: BarRange | null;
	/** Where the cursor starts when there is no loop, counted from 1. */
	bar: number | null;
}>;

/** Where a video sits: beside the score where it fits, else above, or always above. */
export type VideoPlacement = "beside" | "above";

/**
 * How the page first splits between the video and the score: the video as
 * tall as its picture, short enough for the score's first line to show under
 * it, or folded to its grip.
 */
export type InitialLayout = "video" | "firstLine" | "score";

export type EmbedLayout = Readonly<{
	title: boolean;
	video: VideoPlacement;
	initial: InitialLayout;
}>;

/** Where the link back to sound2score sits. */
export type CreditPlacement = EmbedLook["credit"];

/** The slowest speed, in percent of the written tempo. */
export const MIN_SPEED = 25;
/** The fastest speed, in percent of the written tempo. */
export const MAX_SPEED = 200;
/** The furthest a score transposes either way, in semitones. */
export const MAX_SEMITONES = 12;

export const DEFAULT_EMBED_OPTIONS: EmbedOptions = {
	controls: {
		tempo: "on",
		metronome: "on",
		loop: "on",
		transpose: "on",
		fullscreen: "on",
		mixer: "on",
		fretboard: "on",
		piano: "on",
	},
	start: { speed: 100, semitones: 0, metronome: false, bars: null, bar: null },
	layout: { title: true, video: "beside", initial: "video" },
	look: {},
};
