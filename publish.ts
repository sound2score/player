// Builds @sound2score/player and publishes it at the version package.json
// stands at, unless npm has it already. This repository's publish workflow
// runs it, as a job npm trusts, from each release's commit.
import { releases } from "core/ship";

await releases
	.lockstep(releases.vendor(), releases.npm("@sound2score/player"))
	.publish();
