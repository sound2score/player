import { expect, test } from "bun:test";
import { stampSkill } from "./stamp-skill.ts";

test("the skill is stamped at the release's version, its body untouched", () => {
	const doc = "---\nname: p\nversion: 0.0.3\n---\n\nversion: kept\n";
	expect(stampSkill(doc, "0.1.0")).toBe(
		"---\nname: p\nversion: 0.1.0\n---\n\nversion: kept\n",
	);
});

test("a skill with no version to stamp is refused", () => {
	expect(() => stampSkill("---\nname: p\n---\n", "0.1.0")).toThrow(
		'no "version:" line',
	);
});
