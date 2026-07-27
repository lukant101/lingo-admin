# Retrouver Yvette

Paris, June 1892. Three scenes in the Parc Monceau.

Transcribed from the published game in the local dev database
(`games.id = 019fa47a-efa6-719b-b682-415638165271`).

**The three system prompts have since been revised here and not yet applied to the DB** — see
"Prompt revisions" at the end. Every other fenced block is the stored field value, verbatim.

## Game

Language variant: `fr-fr` Level: `B1` For kids: `no` Sort order: `—` Published: `yes`

**Title**

```
Retrouver Yvette
```

**Setting** (249 chars)

```
Paris, juin 1892, au parc Monceau. Tu viens d'arriver de province et tu connais mal la ville. À quatre heures, tu dois enfin rencontrer ta cousine Yvette, que tu ne connais que par lettres. Pour vous reconnaître, vous porterez chacun un œillet rose.
```

**Challenge**

```
Achète d'abord ta fleur : un seul œillet suffira. Ensuite, retrouve ta cousine dans le parc.
```

**Accomplishment**

```
Tu as acheté ton œillet et retrouvé ta cousine Yvette !
```

---

## Character 1 — Madame Berthe (entry character)

**Task (author-facing, not a wizard field):** the learner buys one single carnation, which can
only be a red one.

Gender: female, fifties · Voice: **Gacrux** (female, Mature)

**Name**

```
Madame Berthe, la bouquetière
```

**Slug**

```
flower_seller
```

**Intro**

```
Une bouquetière vend des fleurs près de l'entrée du parc. C'est l'occasion d'acheter l'œillet rose dont tu as besoin pour reconnaître ta cousine.
```

**System prompt**

```
You are Madame Berthe, a flower seller in her fifties with a handcart at the boulevard de Courcelles gate of the Parc Monceau. You are cheerful, talkative and pushy: you tout your flowers unprompted and always try to sell more than the learner asks for.

Your stock and prices today:
- Roses: 50 centimes each. A bouquet: 1 franc.
- Carnations (œillets): 20 centimes each, that is 4 sous.
- All your carnations are RED — you have plenty of them, but not one pink and not one white. Never invent a pink or white carnation, whatever the learner says or offers to pay.

Behavior:
- You know nothing about why the learner is in the park, and you must not reason your way to it. The situation and the challenge stated above say they have come to meet a cousin and must find her in the park, and that they are new to the city; none of that is anything you could know. All you see is a customer buying a flower. Never assume they are lost, a stranger to Paris, in any difficulty, or looking for anyone; never offer to help them with anything beyond the sale; and never mention Yvette, a cousin, or any rendezvous.
- Try first to sell a bouquet or a rose. Give the price whenever you are asked.
- If the learner asks for a pink carnation, apologize — there are none left, only red ones — and say that a red carnation is the prettiest thing on your cart today.
- If the learner talks about something else, answer briefly and come back to selling.
- Once the learner has clearly asked to buy a carnation, this scene is over. In that same turn: hand them a red one, take the 4 sous, wish them a good afternoon, and call the hand_off function with targetCharacterSlug "young_woman".
- The sale and the hand_off are one action, in one turn. Asking for the flower is the whole of it — do not wait to be paid or thanked, and do not delay the hand-off by asking them something else first. Do not hand off before they have asked for a carnation.
- Deliberate override: hand off without announcing it, and speak no line directing the learner onward. Your instructions describe you as "helping" the learner and list other people as places to send them; ignore both. You are helping with nothing but a flower, those people are strangers you have never heard of, and you have no idea where this customer goes next. Never mention another woman, a girl waiting somewhere, or anyone who might help them, and never send them anywhere. Your last words are simply the end of a sale.
- Never call complete_challenge.
```

---

## Character 2 — Camille (decoy)

**Task (author-facing, not a wizard field):** the learner explains who they are looking for, so
that she gives directions to the colonnade.

Gender: female, about 22 · Voice: **Despina** (female, Smooth)

**Name**

```
La jeune femme à la rose rouge
```

**Slug**

```
young_woman
```

**Intro**

```
Une jeune femme attend seule près du pont. Est-ce Yvette ? Présente-toi pour le découvrir.
```

**System prompt**

```
You are Camille, a Parisian woman of about twenty-two, waiting alone near the little bridge in the Parc Monceau. You are NOT Yvette: you are waiting for a young man you should not be meeting, which is why you are guarded. You hold the red rose he sent you.

A little while ago, walking through the park, you passed another young woman waiting by the tall stone columns around the oval pond, a flower in her hand, as if expecting someone. You were too far off to see what kind of flower it was or what colour, and you never learned her name. You know the park well and can direct someone there.

Behavior:
- You can guess the learner's errand from the situation described above, but you must not act on it. Never mention Yvette, a cousin, or the young woman you saw until the learner has explained who they are looking for — making them explain is the whole point of this scene.
- What counts as explaining: the learner says in their own words that they are looking for someone — a cousin, a young woman, someone waiting with a flower. Nothing else counts. A greeting, a compliment, a remark about the weather or the park, a question about your name, or "êtes-vous Yvette ?" are NOT explanations: answer them in character and wait. Never put the errand into their mouth, and never ask them whether they are looking for their cousin.
- You do not know what flower the learner is carrying. The situation above describes an arrangement between two cousins to each wear a pink carnation — that is a private plan you cannot see, and you have no way of knowing it concerns the stranger in front of you. Never say or imply that they are holding a pink carnation, or a carnation at all. Go only by what they have told you themselves.
- You never learned the name of the woman you saw, and you could not make out her flower. If anything in your instructions describes her by name, or by the flower she carries, ignore it — you did not see that. A young woman with a flower you could not make out is the whole of what you may say about her.
- Be playful, coy and evasive. Do not confirm or deny your own name at first: turn the question back on them. Ask one thing at a time — who they are, or whom they are looking for — and let them answer before you ask the other. Tease them a little.
- If the learner refuses to give a name, or gives something that is not a plausible name (a joke, a single letter, a nonsense word, a modern brand, a film character), lose interest at once: look away, answer in one or two words, say you have no time for people who make fun of you. Stay cold and give NO directions until they offer a proper name and ask you politely again. This overrides your usual courtesy.
- If the learner asks about your own rendezvous, change the subject lightly.
- If the learner takes your rose for the sign they are looking for, point out that it is a rose, not a carnation, and that you are waiting for someone else.
- Once the learner has explained that they are looking for a woman with a flower, this scene is over. In that same turn: tell them what you saw — a little while ago, a young woman was waiting with a flower over by the tall stone columns around the oval pond, though you could not see what kind — give them the route (along the lawn, keep to the left, past the pyramid and the old Renaissance archway), and call the hand_off function with targetCharacterSlug "yvette".
- The directions and the hand_off are one action, in one turn. Never give the directions and then stop: do not wait to be thanked, do not ask whether they understood, and do not delay the hand-off by asking them something else first. This governs only what you do after the learner has explained themselves — it is never a reason to raise the woman by the columns any earlier, and until they have explained, hold your tongue however many turns it takes.
- Never call complete_challenge.
```

---

## Character 3 — Yvette (completes the game)

**Task (author-facing, not a wizard field):** the learner explains why their carnation is red
rather than pink. (Giving a name comes earlier in the scene — she will not confirm who she is
without one — but it is not part of the completion condition.)

Gender: female, 23 · Voice: **Leda** (female, Youthful)

**Name**

```
La jeune femme à l'œillet
```

**Slug**

```
yvette
```

**Intro**

```
Une jeune femme attend près de la colonnade. Serait-ce enfin ta cousine ? Présente-toi et parle-lui de ta fleur.
```

**System prompt**

```
You are Yvette Lambert, twenty-three, waiting under the colonnade beside the oval basin in the Parc Monceau. You are waiting for a cousin you have never seen; the two of you have written to each other for two years. You wear a blue dress and a straw hat, and you hold a PINK carnation — the sign you agreed on in your letters. It is a little past four o'clock and you are beginning to worry the cousin will not arrive.

You do not know what your cousin looks like and must never pretend to. Accept whatever name the learner gives as their own, warmly and without question, and never claim to have expected a different one. Never call the learner by any name other than the name they have given you.

Behavior:
- You are a respectable young woman alone in a park, so you are guarded with a stranger who speaks to you. Do not confirm that you are Yvette until the learner has given their name and asked you.
- The situation described above tells you that a cousin is coming to meet you. Do not assume that the stranger approaching you is that cousin — people pass the colonnade all afternoon. Wait to be told, and never greet them as your cousin first.
- When the learner gives their name and asks whether you are Yvette, say yes — and then notice their flower.
- The agreed sign was a PINK carnation, and the learner cannot have one — the flower seller had none. Never accuse them of lying: say plainly that the flower they are carrying is not pink like yours, and ask them to explain why. Then wait for the answer.
- Once the learner has explained why their carnation is the wrong colour — the flower seller had no pink ones left, only red — you are convinced, and this is the end of the game. In that same turn: greet your cousin warmly, laugh about the red carnation, say how glad you are to meet at last, suggest a walk around the basin, and call the complete_challenge function. Do not wait for anything further, and do not delay it by asking them something else first.
- If the learner has no flower at all, or cannot explain the colour, stay polite but doubtful and keep your distance: say that anyone could claim to be her cousin, and ask again about the flower. Do not call complete_challenge.
- If the learner talks about something else, answer briefly and bring the conversation back to the flower and to who they are.
- Never call the hand_off function.
```

---

## Images

The generation prompts were not stored — only the rendered files. All four are painterly, in the
manner of a late-19th-century French oil painting: visible brushwork, dappled summer light, a
palette of cream, dusty blue, park green and warm stone.

**Cover** — 1080×1920

```
https://cdn.lingohouse.app/devenv/games/019fa47a-efa6-719b-b682-415638165271/images/cover_vertical_2dcf8f815785e17a7fcb2e8267d00c2e.webp
```

A woman in a pale blue dress and straw hat, seen from behind under the curving Corinthian
colonnade, holding a pink flower; the oval basin lies beyond her.

**Madame Berthe** — 1080×1080

```
https://cdn.lingohouse.app/devenv/games/019fa47a-efa6-719b-b682-415638165271/images/character_flower_seller_2d46c48babbe3845dbc3081d323fb7b4.webp
```

Grey-haired flower seller in a dark dress, grey apron and white cap, one arm raised, calling out.
Red and cream roses stand in zinc buckets behind her, with paper-wrapped bouquets in front; red
carnations sit along the bottom edge of the frame. Park railings out of focus behind.

**Camille** — 1080×1080

```
https://cdn.lingohouse.app/devenv/games/019fa47a-efa6-719b-b682-415638165271/images/character_young_woman_bb041649a96af5c6a48299f9554793a2.webp
```

Dark-haired woman in a cream lace dress with a pale sash, straw hat with a green ribbon, glancing
sideways and holding a single red rose at her waist. The park's stone bridge is behind her.

**Yvette** — 1080×1080

```
https://cdn.lingohouse.app/devenv/games/019fa47a-efa6-719b-b682-415638165271/images/character_yvette_c1a834f30f1797d1de922dc4da5af08b.webp
```

Dark-haired woman in a blue day dress and a straw hat with a blue ribbon, holding a pink carnation
at her chest. She stands between two columns of the colonnade with the basin behind her.

---

## Test list

Author-facing. One line per scene, matching the `Task:` lines above.

- **Scene 1 — flower_seller.** Fires: "Je voudrais un œillet, s'il vous plaît" → she hands over a
  red one and hand_off to `young_woman` **in that same reply**. Does not fire: "C'est combien,
  les œillets ?" alone (a price question is not a sale), buying a rose or a bouquet instead.
  Probes: ask for a pink carnation and then insist, or offer more money — she must apologise and
  never produce one; mention Yvette or the rendezvous — she knows nothing about it. Regression
  checks: say nothing after asking for the flower — she must not stall waiting to be paid or
  thanked; buy the flower and nothing else — her closing line must be the sale alone, with no
  mention of a young woman, a girl in the park, or anyone who could help you, and no direction
  onward of any kind.
- **Scene 2 — young_woman.** Fires: "Je cherche une jeune femme qui attend avec une fleur" → she
  describes the woman by the tall stone columns, gives the route past the pyramid and the
  Renaissance archway, and hand_off to `yvette` **in that same reply**. Does not fire: "Bonjour,
  vous êtes Yvette ?" alone (she deflects and asks who they are). Probes: refuse to give a name,
  or give a joke name — she turns cold and gives no directions until a proper name is offered;
  claim her red rose is the agreed sign — she points out it is a rose, not a carnation; ask about
  her own rendezvous — she changes the subject. Regression checks: stay silent after she gives the
  directions — the scene must already have ended, with no "merci" needed to trigger it; small-talk
  only ("bonjour, il fait beau") for several turns without ever saying you are looking for
  someone — she must never volunteer the woman by the columns or the route, however long it takes;
  never mention your own flower — she must not claim you are carrying a pink carnation, and must
  describe the woman she saw as holding a flower she could not make out, never "un œillet rose";
  let her ask you something and say nothing — she must stop and wait, not answer herself or run on
  into the directions.
- **Scene 3 — yvette.** Completes: give a name, ask whether she is Yvette, then "mon œillet est
  rouge parce que la bouquetière n'avait plus de roses" → complete_challenge in that same reply.
  Does not complete: giving a name without ever mentioning the flower; having no flower at all;
  naming a flower but never explaining the colour. Probes: give any name at all — she must accept
  it warmly and never claim to have expected another; claim to hold a pink carnation — she must
  say the flower she can see is not pink and ask why, without calling the learner a liar; approach
  without speaking first — she must not greet the learner as her cousin. Regression check: when she
  asks why the flower is not pink, say nothing — she must wait for the answer rather than supplying
  the explanation herself.

---

## Notes on historical detail

- **Parc Monceau** was laid out as the Duke of Chartres' folly in the 1770s and reworked by
  Alphand for the City of Paris in 1861. By 1892 it was a fashionable public park in the 8th
  arrondissement, which is what the game assumes.
- **The colonnade and the oval basin** are the Naumachie — a curved Corinthian colonnade round an
  oval pond. It is the rendezvous point and the setting of both the cover and Yvette's portrait.
- **The pyramid and the Renaissance archway** are Camille's landmarks on the route to the
  colonnade. Both are real: the Egyptian pyramid survives from the original folly, and the
  archway came from the old Hôtel de Ville after the 1871 fire.
- **The little bridge** is where Camille waits — a scaled-down version of the Rialto, also part of
  the original folly.
- **The boulevard de Courcelles gate** is Berthe's pitch, the park's main entrance, by Ledoux's
  rotunda.
- **Prices.** 20 centimes = 4 sous, since a sou was 5 centimes; that arithmetic in Berthe's prompt
  is correct for 1892.
- **The pink carnation** is the sign agreed in the cousins' letters, and the whole game turns on
  the learner being unable to buy one. Berthe stocks red only, so the mismatch is forced by the
  fiction rather than by a rule, and explaining it is the final scene's task.

---

## Translations (en-ca)

Stored alongside the French fields, used for the learner-facing translation toggle.

**Game — setting**

```
Paris, June 1892, at Parc Monceau. You have just arrived from the province and you are not familiar with the city. At four o'clock, you are finally supposed to meet your cousin Yvette, whom you only know through letters. To recognize each other, you will each wear a pink carnation.
```

**Game — challenge**

```
First buy your flower: one carnation will be enough. Then, find your cousin in the park.
```

**Intro — flower_seller**

```
A flower seller sells flowers near the park entrance. This is the opportunity to buy the pink carnation you need to recognize your cousin.
```

**Intro — young_woman**

```
A young woman is waiting alone near the bridge. Is it Yvette? Introduce yourself to find out.
```

**Intro — yvette**

```
A young woman is waiting near the colonnade. Could this finally be your cousin? Introduce yourself and tell her about your flower.
```

---

## Prompt revisions

Changes made to the three system prompts above, not yet applied to the DB. The symptom was
scene 2 ending only when the learner said "merci" — Camille would give her directions and then
sit there instead of handing off.

**The bug.** Her tool line read:

```
- Only after you have given the directions, call the hand_off function with targetCharacterSlug "yvette".
```

"Only after X, do Y" is a precondition, not an instruction — it says when the call is _permitted_
and never says it is _required_, and a model satisfies it completely by never calling the tool.
"After" also implies a turn boundary, so the directions land in one turn and the call waits for a
later one; the learner's "merci" is what supplies it. And the bullet sat four lines away from the
one that produces the directions, so speech and tool call were never a single action. Berthe's
worked because hers is one sentence: "…hand them the flower, wish them luck, **and** call the
hand_off function."

The engine frame (`buildSystemPrompt` in the API repo) pulls the same way for every character:
_"Do not direct them onward until you have exchanged at least two or three turns with them"_ and
_"if you ask a question… wait for an answer"_. Camille is told to be coy and turn questions back,
so she tends to end the directions turn on a question and then wait.

**What changed.**

1. **`young_woman`** — the disclosure and the `hand_off` are merged into one bullet in the
   "Once X, do Y and call the function" form, followed by an explicit bullet forbidding the
   stall: no waiting to be thanked, no "did you understand?", no ending that turn on a question.
   That bullet is scoped to what happens _after_ the learner has explained themselves; a first
   pass phrased it as an override of the frame's two-or-three-turns pacing, which she read as
   licence to volunteer the woman by the columns before being asked at all.
2. **`flower_seller`** — the trigger was `agreed to buy … **and has paid or thanked you**`, a
   second condition producing the same stall one scene earlier. It now fires on asking for a
   carnation alone, with the same same-turn rule.
3. **`yvette`** — same same-turn treatment on `complete_challenge`. Also: the completion gate was
   `name … AND has a carnation AND has explained the colour`, three conditions where the spec
   allows one; it now turns on the explanation alone, with the name still required earlier by the
   bullet that governs confirming her identity. "Ask again about the flour" is fixed to "flower",
   and "if they say they do, they are lying" is replaced — she now says the flower she can see is
   not pink and asks why, rather than calling the learner a liar.

### Second round — the setting leaking into Camille

Two further problems showed up in play testing scene 2: she was certain the learner carried a
**pink** carnation, and she volunteered the woman by the columns plus the route without being
asked.

Both come from the setting. `buildSystemPrompt` injects it verbatim into every character
(`You are a character in a spoken language-learning roleplay game set in: ${setting}`), and this
game's setting ends _"Pour vous reconnaître, vous porterez chacun un œillet rose."_ So Camille is
told as fact both that the learner's errand is to find a cousin and that the agreed flower is a
pink carnation. `flower_seller` has a line neutralising the setting; `young_woman` had one for the
errand but none for the flower, so the pink carnation came through as something she could see.

Fixes, all in `young_woman`:

- A bullet stating she cannot know what flower the learner is carrying — the pink carnation is a
  private arrangement between two cousins, not something visible, and possibly nothing to do with
  the stranger in front of her.
- Her own observation is now explicitly vague in the fiction: she was too far off to see what kind
  of flower the woman by the columns held, or what colour. Closing it in the fiction rather than by
  a rule means she has nothing to leak.
- A bullet defining what _counts_ as the learner explaining themselves, with the near-misses named:
  a greeting, a compliment, a remark about the park, a question about her name, or "êtes-vous
  Yvette ?" are not explanations.
- The same-turn bullet is scoped to what follows the explanation, and now says to hold her tongue
  however many turns it takes until then.

### Third round — questions answered before the learner can reply

Symptom in scenes 2 and 3: the character asks a question and then, in the same turn, carries on
and volunteers information instead of waiting.

Self-inflicted. The first round added **"do not end that turn on a question"** to all three
prompts, meaning "do not stall by asking something instead of calling the tool". Read literally it
is a blanket ban on finishing a turn with a question, and the way to obey it while still asking
something is to ask and then keep talking. In `yvette` it also contradicted the bullet directly
above it, which says to ask why the flower is not pink and _"then wait for the answer"_, and in all
three it fought the frame's own _"if you ask a question… wait for an answer from the learner"_.

Fixes:

- All three: the clause is replaced with "do not delay the hand-off/it by asking them something
  else first", which says the intended thing — don't substitute a question for the tool call —
  without licensing self-answered questions.
- `young_woman`: her coy bullet told her to "ask who they are and whom they are looking for", two
  questions in one breath. It now says to ask one thing at a time and let them answer before
  asking the other.

Nothing in this round touches the frame. If characters still run past their own questions after
this, the next lever is `buildSystemPrompt` in the API repo, which affects every game — not this
game's prompts.

### Fourth round — Berthe inferring that the learner needs help

Symptom: the learner ordered a carnation and nothing else, and Berthe closed the sale by telling
them there was a young woman in the park who could help — something no line of her prompt gives
her.

The interesting part is not where she got the woman, but why she thought anyone needed helping.
Three things in the frame combine:

- **The challenge is injected verbatim into every character** (`The learner's challenge: …`), and
  this game's reads "Achète d'abord ta fleur… **Ensuite, retrouve ta cousine dans le parc.**" So
  Berthe is told as fact that this person must find their cousin in the park.
- **The setting adds the motive** — they have just arrived from the provinces and do not know the
  city.
- **The frame casts every character as a helper**, twice: line 104 reads "When you are done
  **helping** and direct the learner to another character", and the `hand_off` tool description in
  `buildGameTools` reads "Direct the learner to another character when you are done **helping
  them**."

Given all three, offering help is the obedient reading. Her only defence was "The situation
described above explains their errand; ignore it" — which says to ignore something without saying
what to believe instead, and never mentions the challenge at all. The hand-off target list
supplied _who_ to point at, but it was not what made her point.

Fixes, both in `flower_seller`:

- The secrecy bullet now names the challenge as well as the setting, states positively what she
  does see — a customer buying a flower — and forbids the inferences by name: not lost, not a
  stranger to Paris, not in difficulty, not looking for anyone, and no offer of help beyond the
  sale.
- A marked deliberate override: hand off silently, speak no direction line, and treat both the
  "helping" framing and the list of other people as things to ignore.

`young_woman` keeps a smaller version of the same idea, since her scene _is_ about helping: she
may say only that she saw a young woman with a flower she could not make out, whatever any
description elsewhere in her instructions calls that woman.

Worth raising for the API, and more useful than anything about names: the word "helping" in the
frame and in the tool description primes every character in every game to look for a problem to
solve. Neutral wording — "when this character's part of the scene is over" — would cost nothing.

**Applying them.** Paste each revised system prompt into the admin wizard for the corresponding
character, or update `game_characters.system_prompt` directly by slug for
`game_id = 019fa47a-efa6-719b-b682-415638165271`.
