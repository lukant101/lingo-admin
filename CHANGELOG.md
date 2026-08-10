# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-08-09

### Fixed

- The deck creation wizard now requires deck audio and treats video as optional, matching the
  API. Publishing has required audio and allowed video-only decks to fail since API 0.4.6, but
  the wizard still accepted a video-only draft, so an author could complete every step and only
  hit `DECK_AUDIO_NOT_SET` at publish. The Media step now blocks on missing audio, a resumed
  video-only draft reopens on Media instead of skipping ahead, and the review step no longer
  flags an absent video as an error
- The step indicator on the new-deck screen said "Video" where the wizard says "Media", a label
  missed when the step was renamed in 0.2.2
- `deploy:web` now sets `EXPO_PUBLIC_APP_ENV=production`. It only overrode `EXPO_PUBLIC_API_URL`,
  so `.env.local` supplied `development` to the production build and web uploads landed under the
  `devenv/` storage prefix. Uploads from the deployed app now use the unprefixed paths; anything
  staged by an earlier build stays where it was written

## [0.2.2] - 2026-08-08

### Changed

- Deck audio and deck video are now independent: deck audio can be added to any deck,
  including one that already has a video. The published deck editor always offers the
  audio field, and the creation wizard's Media step takes a video and an audio clip
  side by side instead of forcing a choice between them
- Decks can now be published without a video, so the publish screen no longer claims to
  be transcoding one

## [0.2.1] - 2026-07-30

### Added

- A "Content version" field in the game draft editor (pre-filled with 1) and in the published
  game editor, so the version of the authoring `games.db` content a game came from can be set
  while authoring and corrected later
- A warning when an uploaded game image is materially off-ratio, since on web the image is
  silently centre-cropped instead of offering the native crop UI

### Changed

- Game character images are now vertical (9:16) instead of square, matching the game cover
  image
- Editing a game's accomplishment now offers to regenerate translations, as editing the
  setting, challenge, or character intros already did

## [0.2.0] - 2026-07-23

### Added

- Video creation tools: a new Videos tab for building platform videos, with AI-assisted script chat, image generation, TTS audio, and song generation
- Games: a new game editor with drafts, translations, character images/gender, and an updated Gemini voice list
- Deck and collection management: edit published platform decks, assign decks to collections, and more flexible audio/video uploads

### Changed

- Reorganized navigation: Games, Decks, and Video Projects now live on the bottom tab bar

### Fixed

- Various upload and UI error fixes across the deck and game editors

### Removed

- Removed the Studios tab and the creator application/monetization flows it depended on — not part of this admin app

## [0.1.1] - 2026-05-14

### Changed

- Allow platform videos up to 5 minutes long

## [0.1.0] - 2026-04-18

### Added

- Initial `lingo-admin` app, forked from `lingo-creators@1.0.1`.
- Firebase Auth wired to the `lingo-mates` project so Lingo Mates users can sign in.
