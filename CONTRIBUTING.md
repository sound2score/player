# Contributing

Pull requests are welcome. This repository is a mirror of the StringSync
monorepo, rebuilt from it on every release, so a pull request is never merged
here on GitHub. A maintainer brings it into the monorepo instead, and it
reaches this repository with the next release.

## Opening a pull request

1. Fork the repository and branch from the latest commit on the default branch.
2. Make your change, with tests for it, and run `bun install`, `bun test` and
   `bunx biome check --write . && bunx tsc --noEmit` (formats, lints and typechecks) before you push.
3. Open the pull request against the default branch. Say what changes for
   someone using the Player and why.

## What happens to it

A maintainer imports your pull request into the monorepo, keeping you as the
author of the commits. It lands there after the monorepo's own checks, and the
next release rebuilds this repository with it. Then the pull request is closed
with a comment linking the commit here that carries your change.

Expect the pull request to stay open until that release. The commit you see
here will differ from yours in hash, but not in author.

## Files that are generated

Some files here are generated or rewritten when the repository is rebuilt, so
an edit to one cannot be imported as it is:

- `package.json`, `biome.json`, `tsconfig.base.json`, `bunfig.toml` and
  `bun.lock` at the root.
- Everything under `packages/core`, a copy of the monorepo's shared utilities.

If your change needs one of these, make it anyway and say why in the pull
request. A maintainer may carry it over to the monorepo by hand, in the file
that generates it.
