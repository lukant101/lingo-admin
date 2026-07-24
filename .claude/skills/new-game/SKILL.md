---
name: new-game
description: Author content for a Lingohouse conversation game — setting, challenge, accomplishment, per-character system prompts, and image prompts for the admin game creation wizard. Use when creating a new game scenario, revising an existing one, or turning a rough story idea into wizard-ready fields.
---

# Authoring a conversation game

Produce a copy-paste sheet for the game wizard. You are writing **content**, not code.

## 1. Read the prompt frame first

**Before writing any character prompt, read `buildSystemPrompt` in
`../api/api/src/games/game-prompts.ts`** (the API repo, `/Users/lukasz/projects/lingohouse/api/api`).

The wizard's per-character "System prompt" field is only the _last block_ of what the
model receives. The API prepends a frame that already supplies:

- the game's setting and challenge, verbatim;
- "always speak in `<language>` at CEFR level `<level>`" and "keep replies to 1-3 short sentences";
- the learner's gender and age group, for agreement and register;
- pacing rules — react only to what was said, don't volunteer information, don't direct
  the learner onward before two or three turns, **wait for an answer after asking a question**;
- manner — "if the learner is rude, stay courteous but reserved";
- the `hand_off` / `complete_challenge` tool syntax, with the valid slug enum.

**Never restate any of that in a character prompt.** The authored block is appended last
and explicitly overrides the frame, so use it only for who this character is, what they
know, and when they call a tool. Deliberate overrides are fine and should be marked as
such in the text (e.g. a pushy vendor who touts unprompted, a character who turns cold
rather than merely reserved).

## 2. Fields the wizard asks for

Game level (`components/game/GameDraftEditor.tsx`): title, language variant, level,
setting, challenge, accomplishment, for-kids, sort order, cover image.

Per character (`components/game/CharacterCard.tsx`), in array order — **index 0 is the
character the learner meets first**: name, slug, image, intro, voice gender, voice,
system prompt.

Language split:

- **Target language** — title, setting, challenge, accomplishment, character name, intro.
  Address the learner as _tu_.
- **English** — character system prompts.

Length — keep all three short. Detail belongs in the character prompts, not here.

- Setting: where the learner is and what is going on. **Keep it under 350 characters** —
  roughly 3–4 short sentences. Establish place, period, and the errand, then stop; details
  the learner discovers by playing (a character's clothing, exact prices, side-quests)
  belong in the character prompts, not here. Count the characters before delivering.
- Challenge: what the learner must accomplish. One or two sentences, the bare goal — it is
  injected into every character's prompt, so keep it tight.
- Accomplishment: past-tense summary for the celebration screen. One sentence.
- Character intro: shown when the learner first meets the character. Say **what the learner
  needs to do in this scene**, not what the character looks like — the portrait already
  shows that. Name the character's role (flower seller, newspaper vendor) only when it
  bears on the task. One or two sentences, second person. For a scene whose point is a
  question ("is this the right person?"), pose it and prompt the action that answers it,
  without giving away the answer.

Slugs are `^[a-z0-9_]+$`. Voices come from `GEMINI_VOICES` in `types/game.ts` — pick by
the listed style, and give characters in the same scene distinct voices.

## 3. Character prompt shape

Second-person roleplay, then a `Behavior:` bullet list. State tool rules explicitly,
including the negatives — non-final characters get "Never call complete_challenge", the
final character gets "Never call the hand_off function".

```
You are <name>, <age/role>, <where they are>. <Motivation, and what they are hiding or want.>

<Facts only this character knows: prices, stock, directions, the password.>

Behavior:
- <How they respond to the learner's opening.>
- <The gate: what the learner must actually say or do.>
- <Failure branch: what they do when the learner hasn't met the gate yet.>
- Once <gate is met>, <spoken action>, and call the hand_off function with targetCharacterSlug "<next_slug>".
- Never call complete_challenge.
```

The final character calls `complete_challenge` in place of the hand-off.

## 4. Design checklist

- **One gate per scene, stated as a condition the model can check** from what the learner
  said. "Has bought a flower", "has given a plausible name and explained the errand".
- **Every character is told the setting verbatim, so all of them know the whole premise.**
  If a gate requires the learner to explain something the setting already states, the
  character can hand it over unprompted and the scene collapses. Give each such character
  an explicit line telling them to ignore what the frame told them — "you can work out the
  errand from the situation above, but never mention it until the learner says it
  themselves." Write the setting with this in mind: anything in it is public knowledge to
  the cast.
- **Close the loopholes in the fiction, not in the rules.** If the learner must end up
  with the wrong-coloured flower, give the vendor _only_ that colour rather than telling
  the vendor to refuse. A character who cannot supply the wrong answer cannot be talked
  into it.
- **There is no inventory.** The engine tracks nothing between scenes; a later character
  only knows what the learner tells them. Gate progress with hand-offs, and accept that a
  learner who lies about holding an item will be believed.
- **Never gate on knowledge the learner was not given, and give every character an
  in-fiction reason for what they know.** A gate can only require the learner to say
  things they could actually know — don't ask them to name a spot the setting never told
  them. And a character who sends the learner somewhere needs a diegetic reason to know
  the way (they _saw_ the target waiting there, they overheard it) rather than the author's
  own view of the map. Trace each fact a character supplies back to how they came by it.
- **The game never knows the learner's name.** Any character who asks must accept
  whatever is given and must be told never to claim they expected a particular name.
- **Decoys should be named by what the learner can see** ("La jeune femme à la rose
  rouge"), not by their identity — the character name is shown on meeting, so naming the
  target character outright deflates the puzzle.
- **Check period and cultural detail.** Real places, plausible prices, and — for anything
  symbolic — the convention in the _target_ culture, which often differs from English
  (a yellow rose means friendship in English and infidelity in French).
- **Match the level.** At A2 keep the gate to a single transaction; at B1+ the learner can
  be asked to explain, justify, or narrate a mishap.

## 5. Images

All images are **9:16 vertical** — cover and character portraits alike. The mob app
renders the character image as a full-screen background (`contentFit="cover"`), so frame
portraits three-quarter length with headroom.

Publishing is blocked without a cover and one image per character (`validateForPublish`,
`GameDraftEditor.tsx`). Give the user a generation prompt per image, keeping the art
direction, palette, and period identical across all four, and vary a visible detail
between look-alike characters so the images support the puzzle without giving it away.
End each prompt with "No text."

### Give each character a distinct face

Image models default to an attractive average face, so a cast prompted only by clothing
and hair comes back looking like siblings. Beauty adjectives — "pretty", "beautiful",
"handsome", "attractive", even a bare "young woman" — make it worse, because they name the
average directly. Cut them and describe **bone structure** instead; geometry is followed
the way clothing is followed.

Plan the cast as a set before writing any prompt. Give every character a different value
on each of these axes, and never repeat one across two characters in the same game:

| Axis        | Contrasting values                                                                       |
| ----------- | ---------------------------------------------------------------------------------------- |
| Face shape  | long and narrow / round and full / square and broad / heart-shaped                       |
| Nose        | straight and narrow / snub and short / broad and flat / aquiline with a bump             |
| Eyes        | wide-set / close-set / deep-set and hooded / prominent and round                         |
| Brows       | heavy and straight / thin and high-arched / short and sparse                             |
| Mouth & jaw | wide mouth, thin upper lip / small full mouth, pointed chin / long upper lip, square jaw |
| Complexion  | ruddy and weathered / sallow / pale with high colour / olive                             |

Then give each one **a single memorable irregularity** — a mole beside the mouth, freckles
scattered across the nose, a gap between the front teeth, a nose broken once and slightly
off-line, a strong widow's peak, one eyebrow crossed by a small scar. This does more than
anything else on the list, because an asymmetric feature is precisely what the averaging
prior cannot produce.

Habitual expression helps too, described as the marks it leaves rather than a mood: deep
smile lines, a permanent crease between the brows, heavy lids that make her look sceptical.

This matters most exactly where the plot needs two characters to be confusable. Keep the
costume and silhouette similar on purpose, and make the faces sharply different — the
learner should register "another woman in a straw hat", then see plainly that she is not
the same person.

**Cross-check each image prompt against that character's system prompt before handing it
over.** The picture is on screen while the character talks, so every concrete fact in the
prompt — what a vendor stocks, what someone wears, what they are holding — has to appear
in the art. A vendor who offers roses needs roses on her cart, or the learner is being
told to buy something they cannot see. Where the plot turns on something being _absent_,
say so in the prompt ("no pink and no white carnations anywhere") so the learner can see
the constraint rather than just being refused.

## 6. Ask before writing

Content choices are the user's. Use AskUserQuestion for anything the story turns on —
the symbolic object, which character reveals what, how a near-miss differs from the real
thing — and offer a recommendation with the reasoning. Verify factual claims about real
places and customs rather than inventing them.

## 7. Deliver

A copy-paste sheet in wizard order: title/language/level, then setting, challenge,
accomplishment, then per character name, slug, voice, intro, system prompt — then the
image prompts. Fenced blocks per field so each can be copied whole.

Finish with the gates as a testable list, so the user can play through and check each
one fires: which utterance should trigger each hand-off, what should _fail_ to complete
the challenge, and what should complete it.
