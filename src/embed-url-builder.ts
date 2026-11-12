import type { EmbedOptions } from "./embed-options";
import type { EmbedOptionsCodec } from "./embed-options-codec";

/**
 * Builds the address of a score's embed: its options in the query, and the
 * ID your site knows the viewer by as `u`, so each of your students is
 * counted once however many browsers they use.
 */
export class EmbedUrlBuilder {
	private readonly origin: string;

	constructor(
		origin: string,
		private readonly codec: EmbedOptionsCodec,
	) {
		this.origin = origin.replace(/\/+$/, "");
	}

	// vet-ignore named-options-last: the public signature of a published package, whose callers a reorder would break.
	build(scoreId: string, opts: EmbedOptions, userId: string | null): string {
		const params = this.codec.encode(opts);
		if (userId !== null && userId !== "") {
			params.set("u", userId);
		}
		const query = params.toString();
		const path = `${this.origin}/s/${encodeURIComponent(scoreId)}/embed`;
		return query ? `${path}?${query}` : path;
	}
}
