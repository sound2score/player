import { describe, expect, it } from "bun:test";
import { DEFAULT_EMBED_OPTIONS } from "./embed-options";
import { EmbedOptionsCodec } from "./embed-options-codec";
import { EmbedUrlBuilder } from "./embed-url-builder";

describe("EmbedUrlBuilder", () => {
	const builder = new EmbedUrlBuilder(
		"https://sound2score.com/",
		new EmbedOptionsCodec(),
	);

	it("leaves the query off when every option is the default", () => {
		expect(builder.build("abc", DEFAULT_EMBED_OPTIONS, null)).toBe(
			"https://sound2score.com/s/abc/embed",
		);
	});

	it("puts the options and the user ID in the query", () => {
		const options = {
			...DEFAULT_EMBED_OPTIONS,
			start: { ...DEFAULT_EMBED_OPTIONS.start, speed: 70 },
		};

		expect(builder.build("a b", options, "student 7")).toBe(
			"https://sound2score.com/s/a%20b/embed?speed=70&u=student+7",
		);
	});

	it("leaves an empty user ID out", () => {
		expect(builder.build("abc", DEFAULT_EMBED_OPTIONS, "")).toBe(
			"https://sound2score.com/s/abc/embed",
		);
	});
});
