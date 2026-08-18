# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.6] - Unreleased

### Added

- Cards on an already-published deck can now be edited. The deck editor's card list was
  read-only, on the grounds that changing a card would leave the generated translations
  stale — true, but it left typos, bad recordings and mistranslations fixable only by
  deleting and republishing the whole deck. Each card row now expands in place into an
  editor for its text and its audio clip. The two consequences of an edit are choices
  rather than rules: re-translation ticks itself once the text is dirty but can be turned
  off for a fix not worth regenerating sixty languages over, and turned on to re-run a bad
  translation with the text untouched; replacing a clip pre-ticks "deck audio also needs
  re-recording", since the deck track is one continuous recording of every card, and while
  that is ticked the save is blocked until the new track is uploaded, so a deck is never
  knowingly left inconsistent. Re-translation runs in the background, so the row shows its
  progress and then either success or the languages that failed, with a retry scoped to
  just those. Cards save one at a time, independently of the form's own Save changes.
  Adding, removing and reordering cards remains a pre-publish operation. Needs the matching
  API release that serves `/admin/decks/:deckId/cards/:cardId` and its translation-job
  endpoints; against an API without it, saving a card fails rather than silently doing
  nothing

### Removed

- In-app audio recording is gone. Admins upload prepared audio rather than recording it
  themselves, so the Record button on card audio — in the deck creation wizard as well as
  the new published-card editor — was a path nobody took. Picking a file is now the only
  way to set card audio, as it always has been for the deck-level track. This also removes
  the record screen, the module-level handoff it used to return a clip to whichever screen
  opened it, and the recorder hook, along with the "this browser does not support audio
  recording" notice that the wizard showed when a browser lacked the necessary support

## [0.2.5] - Unreleased

### Added

- Deck tags can now be managed from the admin app, both while creating a deck and when
  editing one afterwards. Tags are free-form topical labels (`story`, `travel`, `bible`)
  that have existed in the data model since the import but that no admin surface has ever
  read or written. The deck editor gains a Tags card, the creation wizard's Review &
  Publish step gains the same field, and the deck list shows each deck's tags so an
  untagged deck is visible without opening it. The field suggests tags other decks already
  use, with their deck counts — there is no controlled vocabulary, so the suggestions are
  what keep a fourth spelling of the same label from being typed in. Tags are normalised
  (trimmed, lowercased, deduped, at most 20 of 50 characters) on the way in. Needs the
  matching API release that serves `/admin/deck-tags` and accepts `tags` on a deck or
  draft; against an API without it the fields stay empty rather than failing

## [0.2.4] - Unreleased

### Changed

- Deck audio may now be as short as 5 seconds, down from 10. The old floor was
  inherited from the video minimum rather than chosen for audio, and it was blocking
  legitimate short clips. Nothing outside the admin UI enforced it — the API performs
  no duration validation and the storage rules cap size only — so this lifts a
  restriction that was never a technical constraint

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
