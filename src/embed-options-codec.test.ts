import { describe, expect, it } from "bun:test";
import { DEFAULT_EMBED_OPTIONS, type EmbedOptions } from "./embed-options";
import { EmbedOptionsCodec } from "./embed-options-codec";

const codec = new EmbedOptionsCodec();
const decode = (query: string) => codec.decode(new URLSearchParams(query));

describe("EmbedOptionsCodec", () => {
	it("leaves every default out", () => {
		expect(codec.encode(DEFAULT_EMBED_OPTIONS).toString()).toBe("");
		expect(decode("")).toEqual(DEFAULT_EMBED_OPTIONS);
	});

	it("reads back what it wrote", () => {
		const options: EmbedOptions = {
			controls: {
				...DEFAULT_EMBED_OPTIONS.controls,
				tempo: "off",
				mixer: "open",
				piano: "off",
			},
			start: {
				speed: 70,
				semitones: -2,
				metronome: true,
				bars: { from: 9, to: 16 },
				bar: null,
			},
			layout: { title: false, video: "above", initial: "firstLine" },
			look: {
				appearance: "light",
				theme: "volt",
				accent: "#ff00aa",
				background: "transparent",
				credit: "corner",
			},
		};

		const query = codec.encode(options).toString();

		expect(query).toBe(
			"tempo=off&mixer=open&piano=off&speed=70&semitones=-2&click=1&bars=9-16&title=0&video=above&initial=line&appearance=light&theme=volt&accent=ff00aa&bg=transparent&credit=corner",
		);
		expect(decode(query)).toEqual(options);
	});

	it("starts at a bar only without a loop", () => {
		expect(decode("bar=5").start).toMatchObject({ bars: null, bar: 5 });
		expect(decode("bars=2-3&bar=5").start).toMatchObject({
			bars: { from: 2, to: 3 },
			bar: null,
		});
	});

	it("reads each initial layout, and an older snippet's collapse as the score", () => {
		expect(decode("initial=video").layout.initial).toBe("video");
		expect(decode("initial=line").layout.initial).toBe("firstLine");
		expect(decode("initial=score").layout.initial).toBe("score");
		expect(decode("collapse=1").layout.initial).toBe("score");
		expect(decode("collapse=1&initial=line").layout.initial).toBe("firstLine");
		expect(
			codec
				.encode({
					...DEFAULT_EMBED_OPTIONS,
					layout: { ...DEFAULT_EMBED_OPTIONS.layout, initial: "score" },
				})
				.toString(),
		).toBe("initial=score");
	});

	it("drops what it cannot read and keeps the default", () => {
		const options = decode(
			"tempo=open&collapse=yes&initial=firstLine&video=off&speed=500&semitones=13&bars=8-2&bar=0&accent=red&bg=12345&theme=staff-paper&credit=gone&appearance=dim",
		);

		expect(options.controls).toEqual(DEFAULT_EMBED_OPTIONS.controls);
		expect(options.start).toEqual(DEFAULT_EMBED_OPTIONS.start);
		expect(options.layout).toEqual(DEFAULT_EMBED_OPTIONS.layout);
		expect(options.look).toEqual({});
	});

	it("reads a hex color in either case", () => {
		expect(decode("accent=FF00AA&bg=0F0F11").look).toEqual({
			accent: "#ff00aa",
			background: "#0f0f11",
		});
	});
});
