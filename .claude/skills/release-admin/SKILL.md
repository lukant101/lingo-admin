---
name: release-admin
description: Cut and deploy a release of the Lingo Admin web app — version bump, CHANGELOG entry, PR onto the protected main branch, tag on the merge commit, then `npm run deploy:web` to Firebase Hosting (lingo-mates / lingohouse-admin), followed by verifying the shipped bundle. Use this whenever the user asks to release, ship, deploy, publish, or push the admin app to production, to cut a version, to bump the version, or to put a merged change live — even when they only say "deploy it" or "ship this". Also covers rolling back a bad deploy and the separate storage-rules deploy.
---

# Release and deploy the Lingo Admin web app

The admin app is an Expo web build served from Firebase Hosting: project
`lingo-mates`, site `lingohouse-admin`, live at https://lingohouse-admin.web.app.
There is no CI, no test suite, and no deploy script — `npm run deploy:web` builds
and ships in one step, straight from your working tree. That last part is why most
of this skill is about getting the tree into the right state _before_ you build.

Work in two distinct phases and don't blur them: **cut the release** (a PR that
lands on `main`), then **deploy** (build and ship from `main`). Deploying from
anywhere else bakes the wrong commit into the app.

## Before you start

Confirm this is actually a release and not just a merge. A release means the user
wants the live site updated. If they only asked you to merge a PR, stop there and
offer the deploy separately — deploying is outward-facing and shouldn't ride along
unasked.

### Find out what is actually live first

Do this before believing anything else — the CHANGELOG, the tags and the version
files are all claims, and all three have been wrong here at once. The deployed
bundle is the only record that cannot drift, because `deploy:web` bakes
`EXPO_PUBLIC_GIT_SHA` into it:

```bash
live=$(curl -s https://lingohouse-admin.web.app/ | grep -o 'entry-[a-f0-9]*\.js' | head -1)
curl -s "https://lingohouse-admin.web.app/_expo/static/js/web/$live" -o /tmp/live.js
grep -o 'expoConfig?.version??""," (.\{7\})"' /tmp/live.js   # the SHA on the settings screen
```

Then resolve that SHA against the log — `git log --oneline <sha>` and
`git tag --points-at <sha>` — and everything after it on `main` is unreleased,
whatever the CHANGELOG says. Needs no local build and no deploy, so it is also
the honest answer to "is my fix live yet?".

Note the version number itself is **not** a literal in the bundle: it is read
from `expoConfig` at runtime, so grepping for `0.2.5` finds nothing. The SHA is
the only thing to match on.

An absent tag is weak evidence on its own — 0.2.2 shipped without ever being
tagged. The baked SHA is the strong evidence.

## Phase 1 — cut the release

### `main` is protected; you cannot push to it

An active branch ruleset targets `main`. A direct `git push origin main` is
rejected with "push declined due to repository rule violations". Every change,
including one-line build-script fixes, goes through a PR. Don't be misled by old
direct commits in the log (e.g. `3f61fb9`) — the protection was added later.

### Steps

1. **Branch off `main`.** `release/X.Y.Z` for a version release; a descriptive
   `fix/...` branch for a standalone fix.

2. **Bump the version in three files** — `package.json`, `app.json` (the
   `expo.version` field) and `package-lock.json` (both the top-level `version`
   and the one under `packages.""`). All must match; the settings screen reads
   the app.json version and pairs it with the build's git SHA.

   The lockfile drifted behind for a while (it sat at `0.2.1` through the 0.2.2
   and 0.2.3 releases) and was brought back in step at 0.2.5. Keep it in step —
   a lockfile version that trails the app version is the same silent
   inconsistency, one layer down.

3. **Write the CHANGELOG entry.** Keep a Changelog style, newest first:
   `## [X.Y.Z] - YYYY-MM-DD` with `### Added` / `### Changed` / `### Fixed`.
   Date it only once it has actually shipped — an entry for a version still
   sitting on `main` undeployed reads `## [X.Y.Z] - Unreleased`. Two dated
   releases that never shipped (0.2.4, and a 0.3.0 later renumbered 0.2.5) is
   how this file drifted out of step with reality once already.
   Read `git log --oneline main..HEAD` rather than trusting what's already
   written — changes land without entries. Describe the user-visible effect and
   the reason, not the diff; the existing entries are the model to match.

4. **Commit.** A prettier pre-commit hook (husky + lint-staged) reformats staged
   files. It may touch lines you didn't edit if the file wasn't prettier-clean
   before. That's the hook doing its job, not noise to revert — fighting it just
   re-triggers it on the next commit. Mention it in the PR so a reviewer isn't
   puzzled.

5. **Open the PR** with `gh pr create`. Explain why the change is needed, not just
   what changed, and record how it was verified.

6. **Merge with the method stated explicitly.** The repo allows squash, merge, and
   rebase, so the method is never implied — pass it every time. Squash is the
   convention here:

   ```bash
   gh pr merge <n> --squash --delete-branch
   ```

   Past releases read `V0.2.2 — deck audio and video are independent (#9)` in the
   log. A squash defaults to the _commit_ subject, not the PR title, so pass
   `--subject "VX.Y.Z — <summary>"` to keep that pattern.

   If the merge is refused by a permission check rather than by GitHub, don't
   reach for `gh api --method PUT` to get around it — that's the same action in
   disguise. Report the block and ask the user to run it themselves:

   ```
   ! gh pr merge <n> --squash --delete-branch
   ```

### Tag after the merge, never before

Tag the commit that actually landed on `main`, because that's the commit the
deployed build comes from. Tagging the branch head first produces a tag pointing
at a commit that a squash merge then discards.

```bash
git checkout main && git pull --ff-only origin main
git tag -a vX.Y.Z -m "vX.Y.Z — <summary>" <merge-sha>
git push origin vX.Y.Z
```

Tagging has been inconsistent — `v0.2.3` was the first tag ever pushed to this
remote, `v0.2.2` was never tagged, and `v0.1.0`–`v0.2.1` exist only locally. Ask
whether the user wants a tag rather than assuming either way.

## Phase 2 — deploy

### Preconditions

Check all of these before building. The build reads the working tree directly, so
a wrong state ships silently rather than failing.

- On `main`, up to date with `origin/main`.
- Working tree clean. `.firebase/` is untracked and expected — it's a hosting
  cache, not something to commit.
- `package.json` and `app.json` versions match, and the CHANGELOG has an entry for
  that version.
- Firebase CLI authenticated **and already fetched**:

  ```bash
  npx --yes firebase-tools projects:list
  ```

  This should list projects with `lingo-mates (current)`. It does double duty:
  `firebase-tools` is not a dependency of this repo and isn't in `node_modules`,
  so `deploy:web` downloads it _after_ the multi-minute export — running this
  first pre-warms the npx cache and surfaces an auth problem before you've spent
  the build. `--yes` matters; without it npx can sit waiting on an install prompt
  mid-deploy.

  If it wants a login, that's interactive — ask the user to run
  `! npx firebase-tools login`. Don't try to drive it.

### Run it

```bash
npm run deploy:web
```

One command: `expo export --platform web --clear` then
`firebase-tools deploy --only hosting --project lingo-mates`. Give it a generous
timeout — the export takes several minutes.

`--clear` is deliberate (`3f61fb9`): without it a stale Metro cache leaves the old
version and SHA on the settings screen. Don't strip it to save time.

### The env-var trap

`deploy:web` sets three variables inline:

```
EXPO_PUBLIC_API_URL=https://api.lingohouse.app
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD)
```

They're inline for a reason worth internalising: **Expo loads `.env.local` during
`expo export`, and `.env.local` holds dev values** (`EXPO_PUBLIC_API_URL` pointing
at localhost, `EXPO_PUBLIC_APP_ENV=development`). dotenv doesn't overwrite
variables already set in the environment, so an inline assignment wins and
anything _not_ assigned inline silently inherits the dev value.

This has already bitten once: `EXPO_PUBLIC_APP_ENV` was missing from the script,
so the v0.2.2 production bundle shipped with the dev value and rooted uploads
under the `devenv/` storage prefix (`lib/storage.ts:30`). Fixed in `90c6a37`.

So: any new `EXPO_PUBLIC_*` variable that must differ in production has to be
added to the `deploy:web` line. Adding it to `.env.local` alone does nothing for
the deployed app, and the failure is invisible — the build succeeds and ships the
wrong value.

The one still unguarded is `EXPO_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY`, which is
_not_ inlined and so comes from whatever `.env.local` holds. `lib/firebase.ts:65`
only initialises App Check `if (RECAPTCHA_SITE_KEY || __DEV__)`, so a production
build with an empty key deploys cleanly and then blocks every sign-in — and
`.env.example` ships that key empty, so a fresh clone is the dangerous case.
Before deploying from an unfamiliar checkout, confirm the key is non-empty:

```bash
grep RECAPTCHA .env.local
```

and after deploying, confirm the built bundle carries it rather than assuming:

```bash
grep -c "$(grep RECAPTCHA .env.local | cut -d= -f2)" "$f"   # expect 1
```

`EXPO_PUBLIC_GIT_SHA` is read from `HEAD` at build time, which is the other reason
to deploy only from an up-to-date, clean `main`.

## Verify what actually shipped

A successful deploy is not evidence of a correct build. Check the artifact:

Resolve the live bundle first and check _that_ filename against `dist/`, rather
than globbing `dist/` and hoping for a single match — if a stale build ever leaves
a second `entry-*.js` behind, a glob silently expands to two paths and the checks
below stop meaning what they look like they mean.

```bash
live=$(curl -s https://lingohouse-admin.web.app/ | grep -o 'entry-[a-f0-9]*\.js' | head -1)
f="dist/_expo/static/js/web/$live"
ls -1 dist/_expo/static/js/web/entry-*.js | wc -l   # expect 1; investigate if more
test -f "$f" && echo "live bundle matches this build: $live"

grep -o "$(git rev-parse --short HEAD)" "$f" | head -1   # git SHA baked in
grep -c "devenv" "$f"                                    # expect 0 in production
grep -o "api\.lingohouse\.app" "$f" | head -1            # prod API URL
```

The live filename resolving to a file in `dist/` is what confirms the site is
serving this build rather than a cached earlier one. Note the hosting config sets
`max-age=31536000, immutable` on `*.js`, so a browser tab open across the deploy
keeps the old bundle until hard-reloaded — if someone reports "the fix isn't
live", check this way before assuming the deploy failed.

`devenv` is a useful canary because Metro constant-folds the ternary in
`lib/storage.ts`: with `EXPO_PUBLIC_APP_ENV=production` the string disappears from
the bundle entirely, and any non-zero count means the production env didn't take.

Then report the hosting URL and what you verified.

## Rolling back

**The Firebase CLI has no rollback command.** `firebase hosting` offers only
`hosting:clone`, `hosting:disable`, `hosting:channel` and `hosting:sites` — don't
guess at a `hosting:rollback` or `hosting:releases:list`; they don't exist. Two
real options:

- **Firebase Console** — Hosting → release history → _Rollback_ on a previous
  release. Fastest, and it restores the exact files that were serving before.
  Direct the user there: https://console.firebase.google.com/project/lingo-mates/hosting
- **Rebuild from the previous release commit** — slower, and it carries two traps
  that make the naive form of it wrong here. Read the next section before
  reaching for it.

If the site is actively broken and you need it dark immediately,
`npx firebase-tools hosting:disable --project lingo-mates` stops serving traffic.
That's a visible outage, so confirm with the user first.

### If you rebuild an older release, don't trust the tags and don't run its script

**Resolve the target by SHA, not by tag name.** Tag coverage is incomplete and
partly misleading: `v0.2.2` was never tagged, and `v0.1.0`–`v0.2.1` all point at
pre-squash commits that are _not ancestors of `main`_ — checking one out puts you
on an unrelated line of history. Worse, `v0.2.1` exists as both a branch and a tag
pointing at **different commits**, so a bare `git checkout v0.2.1` is ambiguous.
Find the real previous release commit on `main` (`git log --oneline main`) and use
its SHA. Verify before building:

```bash
git merge-base --is-ancestor <sha> main && echo "on main's history"
```

**Never invoke the checked-out `deploy:web`.** The deploy script evolves, and an
older commit's version may be missing env vars added since — which is exactly the
case here: `deploy:web` at `f66613f` (the 0.2.2 release) has no
`EXPO_PUBLIC_APP_ENV=production`, because that fix shipped _inside_ 0.2.3. So
`git checkout f66613f && npm run deploy:web` would fix the outage and silently
reintroduce the `devenv/` storage-prefix bug.

Build the old tree with today's env vars set inline instead, and gate on the
canary before shipping:

```bash
git checkout <sha>
EXPO_PUBLIC_API_URL=https://api.lingohouse.app \
EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_GIT_SHA=$(git rev-parse --short HEAD) \
  npx expo export --platform web --clear
grep -c "devenv" dist/_expo/static/js/web/entry-*.js   # must be 0 before deploying
npx firebase-tools deploy --only hosting --project lingo-mates
git checkout main                                       # don't leave a detached HEAD
```

Generalise the lesson rather than memorising this instance: when rebuilding any
past commit, the build _inputs_ come from today and only the source should come
from the past.

### What a rollback does not revert

Rolling back only changes the served files. It does not revert the tag, the
CHANGELOG, or `main`, and it re-exposes any bug that the rolled-back release had
fixed. Say both parts plainly, and treat the follow-up fix as a new release
through Phase 1.

## Verifying a change locally first

For anything more than a copy tweak, exercise it before releasing.

Run the web app on **port 8082**: `npx expo start --web --port 8082`. The port
matters — the `cdn.lingohouse.app` bucket's CORS config only allows localhost
8081–8083, and outside that range the languages JSON fails to load and collection
pickers come up empty. 8081 is often taken by the sibling `mob` project. Firebase
auth persistence is per-origin, so a new port means signing in again — and you
can't do that for the user; ask them to.

`.env.local` points at the local API (`localhost:3000`, dockerised, hot-reloading)
so local testing never touches production data.

Two things you cannot drive in a browser session: the media pickers call
`DocumentPicker.getDocumentAsync`, which opens a native file dialog that freezes
the extension, and sign-in requires credentials. To exercise draft state without
the pickers, write the fields directly to the local Postgres
(`postgres://lingohouse:localdev@localhost:5432/lingohouse`) and reload — the
wizard hydrates its state from the draft row, so this tests the real code path.
Clean up test rows afterwards.

## Adjacent, and not part of a release

- **Storage rules** deploy separately and are not included in `deploy:web`:
  `npm run deploy:storage-rules` ships `firebase-rules/storage.rules` to
  `lingo-mates`. Editing that file does nothing until this runs.
- **The API** is a different repo (`../api/api`) with its own `deploy-api` skill
  and its own release cadence. A client-only change never requires an API deploy —
  but check whether the change depends on API behaviour that hasn't shipped yet,
  because the admin app talks to production `api.lingohouse.app`.
