# Lingo House conversation game — deliverables spec

**For AI agents.** This file defines exactly what to produce when asked to write a new
Lingo House conversation game. It is the _format and constraints_; the game idea comes
separately, in the message that follows. Read this first, then apply it to that idea.

Produce **content only** — no code, no files. The output is a copy-paste sheet that a human
pastes field by field into an admin wizard.

---

## 1. What a game is

A game is a **spoken roleplay** in a language the learner is studying. The learner talks out
loud with a small cast of AI characters, one at a time, in a fixed order.

- A game is a **chain of scenes**. One scene = one character.
- The learner meets **character 1** first. When they finish that scene's task, the game hands
  them to character 2, and so on.
- When the learner finishes the **last** character's task, the game is complete and a
  celebration screen appears.
- Each character is played by a voice model that has been given the game's setting and
  challenge plus a **system prompt you write** for that character.
- **There is no inventory and no memory between scenes.** The engine tracks nothing. A later
  character knows only what the learner tells them. If a learner claims to be holding
  something, they are believed.

---

## 2. The core rule: one task per scene

**This is the rule the whole design hangs on. Decide each scene's task before writing
anything else.**

**Every scene has exactly one task, and completing it is what ends the scene.** Nothing else
advances the game. Name that task in one plain sentence, then build the scene around it.

The task is almost always an act of communication. It is one of:

- **Get one piece of information out of the character** — where the market is, when the
  train leaves, whether they saw the man in the grey coat.
- **Get one piece of information across to the character** — who sent you, that you are the
  new lodger, that the delivery is late and why.
- **Carry out one transaction**, which is a single act of communication even when it has
  details: _"buy two scoops of vanilla ice cream"_ is one order, not three facts.

Two tests, both cheap:

- The learner could describe what they did **in one sentence**.
- After hearing the character intro once, the learner could **say the task back**.

If the condition that ends the scene needs an **"and"**, it is two tasks. Split or cut.

**Sub-tasks are allowed but should be avoided.** A scene naturally contains a greeting, some
small talk, a clarifying question — fine. What is not fine is letting any of that become a
second requirement for progressing. Only the one identified task ends the scene.

**The task must be checkable** from what the learner actually said: _"has bought a flower"_,
_"has explained the errand in their own words"_, _"has asked which platform the train leaves
from"_. Not _"has been polite enough"_ or _"understands the situation"_.

---

## 3. Deliverables at a glance

| Block         | How many                            |
| ------------- | ----------------------------------- |
| Game fields   | 1 set                               |
| Characters    | **2 minimum, 3 typical, 5 maximum** |
| Image prompts | 1 cover + 1 per character           |

Every field listed in §4 and §5 is **required** unless marked optional. A missing field
blocks publishing.

---

## 4. Game-level fields

Written in the **target language** unless stated otherwise. Address the learner informally
(the _tu_ form, or its equivalent).

### Title

- **Language:** target language.
- **Length:** a short phrase. **Hard limit 300 characters.**
- The name of the game as the learner sees it in a list.

### Language variant

- Given to you with the idea, as a code such as `fr-fr`, `es-419`, `en-ca`.
- Write all target-language text in **that** variant — its vocabulary, spelling, and
  regional usage.

### Level

- One of: **A1, A2, B1, B2, C1, C2** (CEFR).
- The level changes how much language the one task takes, **not how many tasks there are**.
  At A1–A2 make each task a simple transaction or a single question; at B1+ the one task can
  be to explain, justify, or narrate a mishap.
- All character speech must sit at this level.

### Setting

- **Language:** target language.
- **Length: under 350 characters** — roughly 3–4 short sentences. Count them before
  delivering. (Hard limit 2000, but do not use it.)
- Where the learner is and what is going on: place, period, and the errand. Then stop.
- **Critical:** the setting is injected verbatim into _every_ character's prompt, so
  **everything in it is public knowledge to the whole cast.** Details the learner should
  discover by playing — a character's clothing, exact prices, side-quests, the answer to a
  puzzle — belong in character prompts, never here.

### Challenge

- **Language:** target language.
- **Length:** one or two sentences, the bare goal. It is injected into every character's
  prompt, so keep it tight.
- What the learner must accomplish overall. It is the sum of the scene tasks.

### Accomplishment

- **Language:** target language.
- **Length:** one sentence, past tense.
- The celebration line shown when the learner completes the game.

### For kids

- Boolean. `true` if the content is aimed at children.

### Sort order

- Optional integer. Leave blank unless told otherwise.

### Cover image

- A **9:16 vertical** image. You deliver a **generation prompt** for it (§7), not the file.

---

## 5. Character fields

Deliver characters **in play order**. **Character 1 is the one the learner meets first.**
2 minimum, 3 typical, 5 maximum.

### Name

- **Language:** target language, culturally plausible for the setting and period.
- **Hard limit 200 characters** — in practice a few words.
- Shown to the learner the moment they meet the character.
- **Give a first name plus a short role**, not a bare first name: `Rafael, el heladero`,
  `Diego, tu amigo`, `Mme Aubert, la portière`. The role is what orients the learner in the
  scene — use the **job** when the job is why they are talking to this person, and the
  **relationship** when that matters more (a friend, a landlady, an aunt). Drop the role only
  when neither adds anything.
- **Name the trade broadly — never the thing the learner has to ask for.** A hawker whose
  scene turns on being asked for a rosette is `vendedor ambulante`, not
  `vendedor de escarapelas`; otherwise the label answers the scene before he opens his mouth.
  Same rule as §6: what the learner must discover by asking does not go in a field they are
  shown for free.

### Slug

- **Lowercase letters, digits and underscores only** — pattern `^[a-z0-9_]+$`.
- **Unique within the game.** Hard limit 100 characters; keep it short: `waiter`,
  `flower_seller`, `old_man`.
- This is the machine identifier used in hand-off instructions.

### Intro

- **Language:** target language, second person.
- **Length:** one or two sentences. (Hard limit 2000, but do not use it.)
- Shown to the learner the moment they meet this character. It **states that scene's single
  task** — what the learner has to do here.
- Do **not** describe how the character looks; the portrait already shows that. Name their
  role (flower seller, ticket clerk) only when it bears on the task.
- If the intro needs more than a sentence or two to explain what to do, the scene is carrying
  more than one task — go back to §2.
- For a scene whose point is a question ("is this the right person?"), pose the question and
  prompt the action that answers it, **without giving away the answer**.

### Gender

- `female` or `male`. **State it explicitly for every character** — it is what the voice
  gender selector is set to, and it must match both the voice you pick below and the person
  in the image prompt.
- Also give each character an **approximate age** (e.g. "late 60s") next to it, so the voice,
  the system prompt, and the portrait describe the same person.
- Cast the mix the story needs. Do **not** vary gender or age merely to tell characters
  apart — see §7 for how faces are made distinct.

### Voice

- Pick one name from the table. **Characters who appear in the same game should have
  distinct voices**, and pick by the listed style so the voice fits the person.

| Female       | Style      | Male          | Style         |
| ------------ | ---------- | ------------- | ------------- |
| Achernar     | Soft       | Achird        | Friendly      |
| Aoede        | Breezy     | Algenib       | Gravelly      |
| Autonoe      | Bright     | Algieba       | Smooth        |
| Callirrhoe   | Easy-going | Alnilam       | Firm          |
| Despina      | Smooth     | Charon        | Informative   |
| Erinome      | Clear      | Enceladus     | Breathy       |
| Gacrux       | Mature     | Fenrir        | Excitable     |
| Kore         | Firm       | Iapetus       | Clear         |
| Laomedeia    | Upbeat     | Orus          | Firm          |
| Leda         | Youthful   | Puck          | Upbeat        |
| Pulcherrima  | Forward    | Rasalgethi    | Informative   |
| Sulafat      | Warm       | Sadachbia     | Lively        |
| Vindemiatrix | Gentle     | Sadaltager    | Knowledgeable |
| Zephyr       | Bright     | Schedar       | Even          |
|              |            | Umbriel       | Easy-going    |
|              |            | Zubenelgenubi | Casual        |

### System prompt

- **Language: English** (all other character text is in the target language).
- **Length:** guidance, roughly 100–250 words. Hard limit 20000 characters.
- Drives everything the character says and does. See §6.

### Character image

- A **9:16 vertical** image. You deliver a **generation prompt** for it (§7), not the file.

---

## 6. Writing the system prompt

### What is already supplied — never restate it

The engine wraps your text in a frame that **already tells every character**:

- the game's **setting and challenge**, verbatim;
- to always speak in the target language at the given CEFR level, staying in character, and
  to **keep replies to 1–3 short sentences**;
- the learner's gender and age group, for grammatical agreement and register;
- **pacing** — react only to what the learner actually said; never guess at an unclear
  utterance; do not volunteer information unprompted; do not direct the learner onward before
  two or three exchanges; wait for an answer after asking a question;
- **manner** — if the learner is rude, stay courteous but reserved;
- the hand-off and completion tool syntax, and the list of valid character slugs;
- never mention the tools, the mechanics, or being an AI.

**Do not repeat any of it.** Your text is appended last and **overrides** the frame, so use
it only for _who this character is, what they know, and when they end the scene_. A
deliberate override is fine — a pushy vendor who touts unprompted, a character who turns cold
rather than merely reserved — but say so explicitly.

### Shape

Second-person roleplay, then a `Behavior:` bullet list. State tool rules explicitly,
**including the negatives**.

```
You are <name>, <age/role>, <where they are>. <Motivation, and what they want or are hiding.>

<Facts only this character knows: prices, stock, directions, the password.>

Behavior:
- <How they respond to the learner's opening.>
- <The single progressing task: what the learner must actually say or do.>
- <Failure branch: what they do when the learner hasn't done it yet.>
- Once <the task is done>, <spoken action>, and call the hand_off function with targetCharacterSlug "<next_slug>".
- Never call complete_challenge.
```

- **Every character except the last** ends with a `hand_off` to the next character's slug,
  and is told **"Never call complete_challenge."**
- **The last character** calls `complete_challenge` instead, and is told **"Never call the
  hand_off function."**
- The hand-off fires on that **one condition and nothing else** — no "and also", no second
  thing the learner must have mentioned.

### Design rules for the prompt

- **The setting is public knowledge to the cast.** If the scene's task is for the learner to
  explain something the setting already states, the character will hand it over unprompted
  and the scene collapses. Give such a character an explicit line: _"you can work out the
  errand from the situation above, but never mention it until the learner says it
  themselves."_
- **Close loopholes in the fiction, not in the rules.** If the learner must end up with the
  wrong-coloured flower, give the vendor _only_ that colour rather than telling the vendor to
  refuse. A character who cannot supply the wrong answer cannot be talked into it.
- **Never require knowledge the learner was never given.** A task can only ask them to say
  things they could actually know.
- **Give every character an in-fiction reason for what they know.** A character who sends the
  learner somewhere needs a diegetic reason to know the way — they _saw_ the person waiting
  there, they overheard it. Trace each fact back to how they came by it.
- **The game never knows the learner's name.** Any character who asks must accept whatever is
  given, and must be told never to claim they expected a particular name.
- **Name decoys by what the learner can see** ("the young woman with the red rose"), not by
  their identity — the character's name is displayed on meeting, so naming the real target
  outright deflates the puzzle.
- **Check period and cultural detail.** Real places, plausible prices, and — for anything
  symbolic — the convention in the _target_ culture, which often differs from English (a
  yellow rose means friendship in English and infidelity in French). Verify rather than
  invent.

---

## 7. Image prompts

Deliver a generation prompt for **the cover and every character** — the game cannot be
published without all of them.

- **All images are 9:16 vertical.** Cover and character portraits alike.
- Character portraits are shown **full-screen behind the conversation**, so frame them
  three-quarter length with headroom.
- Keep **art direction, palette, and period identical** across every image in the game.
- End each prompt with **"No text."**

### Give each character a clearly different face

**Treat this as a hard requirement, not a nicety.** Image models collapse every face toward
the same attractive average, so a cast described only by clothing, hair, and role comes back
looking like siblings — and a learner who cannot tell two characters apart cannot follow the
story. Assume this failure will happen unless you actively prevent it in the prompt text.

**The faces must differ without changing who the character is.** Do **not** reach for a
different gender, a different age, or a different ethnicity to separate two characters. The
cast composition is a story decision, already fixed by §5 — three women in their thirties from
the same town is a perfectly normal cast, and each of them still has to be unmistakable at a
glance. Differentiate by **facial geometry**, not by demographics.

Beauty adjectives — "pretty", "beautiful", "handsome", "attractive", even a bare "young
woman" — make the sameness worse, because they name the average directly. Cut them and
describe **bone structure** instead; geometry is followed the way clothing is followed.

Plan the cast as a set before writing any prompt. Give every character a different value on
each axis, never repeating one across two characters in the same game:

| Axis        | Contrasting values                                                                       |
| ----------- | ---------------------------------------------------------------------------------------- |
| Face shape  | long and narrow / round and full / square and broad / heart-shaped                       |
| Nose        | straight and narrow / snub and short / broad and flat / aquiline with a bump             |
| Eyes        | wide-set / close-set / deep-set and hooded / prominent and round                         |
| Brows       | heavy and straight / thin and high-arched / short and sparse                             |
| Mouth & jaw | wide mouth, thin upper lip / small full mouth, pointed chin / long upper lip, square jaw |
| Complexion  | ruddy and weathered / sallow / pale with high colour / olive                             |

Complexion varies **within** what is plausible for the character as already cast — weathered
versus pale, ruddy versus sallow. It is not a lever for changing someone's ethnicity.

Then give each one **a single memorable irregularity** — a mole beside the mouth, freckles
across the nose, a gap between the front teeth, a nose broken once and slightly off-line, a
strong widow's peak, one eyebrow crossed by a small scar. This does more than anything else
on the list, because an asymmetric feature is exactly what the averaging prior cannot
produce. Habitual expression helps too, described as the marks it leaves rather than a mood:
deep smile lines, a permanent crease between the brows, heavy lids.

Every character prompt must therefore carry, in words, its own **face shape, nose, eyes,
brows, mouth and jaw, complexion, and one irregularity**. A prompt that names only clothing,
hair colour, and role is not finished.

This matters most where the plot needs two characters to be confusable. Keep the costume and
silhouette similar **on purpose**, and make the faces sharply different.

**Self-check before delivering:** read the cast's face descriptions side by side with the
clothing, hair, gender, and age stripped out. If two of them could describe the same person,
rewrite one — do not fix it by ageing a character up or swapping their gender or ethnicity.

### Cross-check every image prompt against that character's system prompt

The picture is on screen while the character talks, so every concrete fact in the prompt —
what a vendor stocks, what someone wears, what they are holding — **has to appear in the
art**. A vendor who offers roses needs roses on her cart, or the learner is told to buy
something they cannot see. Where the plot turns on something being _absent_, say so
explicitly ("no pink and no white carnations anywhere") so the learner can see the constraint
rather than just being refused.

---

## 8. Output format

Deliver a copy-paste sheet in this order. **Put each field in its own fenced code block** so
it can be copied whole.

```
## Game

Language variant: <code>       Level: <A1–C2>       For kids: <yes/no>

Title
<fenced block>

Setting
<fenced block>            (state the character count, e.g. "312 chars")

Challenge
<fenced block>

Accomplishment
<fenced block>

## Character 1 — <Name>   (entry character)

Task: <the one thing the learner must do in this scene, plain English — author-facing, NOT a wizard field>

Name        <fenced block>
Slug        <fenced block>
Gender      <female|male>, approx. age <e.g. late 60s>
Voice       <name> (<gender>, <style>)
Intro       <fenced block>
System prompt
            <fenced block>

## Character 2 — ...   (same structure; last character completes the game)

## Image prompts

Cover (9:16)          <fenced block>
<Character 1> (9:16)  <fenced block>
...

## Test list

One line per scene, matching the Task lines above:
- Scene 1 — utterance that should trigger the hand-off; something that should NOT.
- ...
- Scene N — utterance that should complete the game; something that should NOT.
```

The `Task:` lines and the test list are **for the author, not for the wizard** — label them
that way so they are not pasted in.

---

## 9. Before you deliver — checklist

- [ ] 2–5 characters, in play order, character 1 is the entry point.
- [ ] Every scene has **exactly one** task, named in one sentence, and no scene's hand-off
      condition contains an "and".
- [ ] Each intro states that scene's task in one or two sentences.
- [ ] Each character name is a first name plus a short role, and no role names the very thing
      the learner has to ask that character for.
- [ ] Every character except the last calls `hand_off` with a **valid slug** and is told never
      to call `complete_challenge`; the last calls `complete_challenge` and is told never to
      call `hand_off`.
- [ ] Slugs match `^[a-z0-9_]+$` and are unique.
- [ ] Setting is under 350 characters and gives away nothing the learner should discover.
- [ ] No character prompt restates the frame (§6) — level, reply length, pacing, politeness,
      tool syntax.
- [ ] Target language used for title, setting, challenge, accomplishment, names, intros;
      **English** for system prompts.
- [ ] Gender and approximate age stated for every character, matching the voice and the
      portrait.
- [ ] Distinct voices.
- [ ] **Every character's image prompt spells out face shape, nose, eyes, brows, mouth and
      jaw, complexion, and one irregularity**, with no value repeated across two characters —
      and no two faces would read as the same person with the hair and clothes removed.
- [ ] Faces were separated by **geometry only**: no character's gender, age, or ethnicity was
      changed to make them easier to tell apart.
- [ ] Every image prompt is 9:16, ends with "No text.", and matches the facts in its
      character's system prompt.
- [ ] Cover prompt plus one prompt per character — none missing.

---

## 10. When to ask instead of inventing

Content choices belong to the person commissioning the game. Ask — with a recommendation and
your reasoning — about anything the story turns on: the symbolic object, which character
reveals what, how a near-miss differs from the real thing. Verify factual claims about real
places, prices, and customs rather than inventing them.
