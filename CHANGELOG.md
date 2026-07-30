# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
