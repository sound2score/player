// Run by the release's prepare step from the package's folder (the root of
// its public repository): stamps the skill's frontmatter `version:` at the
// release's version, SHIP_VERSION, so a copy installed with `npx skills add
// sound2score/player` says which release it came from.

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const VERSION = /^version:.*$/m;

/** The skill, relative to the package. */
export const SKILL = "skills/sound2score-player/SKILL.md";

/** `doc` with its frontmatter's `version:` line set to `version`. */
export function stampSkill(doc: string, version: string): string {
	const front = doc.match(FRONTMATTER)?.[0];
	if (front === undefined || !VERSION.test(front)) {
		throw new Error(
			'the skill has no "version:" line in its frontmatter to stamp',
		);
	}
	return (
		front.replace(VERSION, () => `version: ${version}`) +
		doc.slice(front.length)
	);
}

if (import.meta.main) {
	const version = process.env.SHIP_VERSION;
	if (!version) {
		throw new Error("SHIP_VERSION is not set: the release's prepare sets it");
	}
	await Bun.write(SKILL, stampSkill(await Bun.file(SKILL).text(), version));
	console.log(`${SKILL} stamped ${version}`);
}
