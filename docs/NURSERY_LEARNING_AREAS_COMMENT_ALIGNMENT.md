# Nursery (pre-primary) comments — alignment to the five learning areas

This document maps the observation / comment stems you provided to the **five strand subjects** used in PwezaCore for Baby Class, Middle Class, and Top Class (same strings as in `class_subjects`, exam results, and `prePrimaryHolisticRatings.ts`).

**Important:** Your original list grouped some items under headings like “Social Development” and “Physical Development.” Where a stem fits the curriculum better under a different strand (e.g. toilet independence under **health**), it is placed under that learning area and noted.

---

## The five learning areas (exact names in the system)

| # | Learning area (subject string in app) | DB strand key (`nursery_detailed_observation_items.strand`) |
|---|----------------------------------------|-------------------------------------------------------------|
| 1 | **Relating with others (Social development)** | `social_development` |
| 2 | **Relating and knowing my environment (Language I)** | `knowing_environment` |
| 3 | **Taking care of myself (Health habits)** | `health_habits` |
| 4 | **Development and using mathematical concepts** | `mathematical_concepts` |
| 5 | **Development and using language (Language II)** | `language_development` |

Holistic exam input uses **three skills per strand** (15 cells). The bullets below are **finer observation stems**; many will map to one skill per strand when we wire detailed comments to ratings.

---

## 1. Relating with others (Social development)

*Aligned DB subsection examples: `behaviors_emotions`.*

- Waits for their turn to be told.
- Performs simple independent skills.
- Conveys personal needs to the teacher.
- Observes and obeys rules.
- Needs to pick up confidence and settle in class.
- Can stand up and talk without fear to anyone politely.
- Sometimes fights friends.
- Participates in discussions.
- Makes friends quickly and is sympathetic to them.
- Moods can be unstable; easily irritable and gets annoyed quickly.
- Sometimes not co-operative.
- Loves participating in all class activities.

**Note:** You had *“Takes themselves to the toilet on their own”* under Social; for the five learning areas it aligns with **Taking care of myself (Health habits)** (see section 3).

---

## 2. Relating and knowing my environment (Language I)

*Aligned DB subsection examples: `theme_transport` (environmental / theme work).*

- Can define the theme (transport) and tell/draw the types.

**Note:** Naming, cleanliness, and caring for the environment are the three **skills** under this strand in the app; your list did not add separate stems for those labels—only the transport theme line above sat clearly in “environmental studies.” We can add more stems later under this area if you provide them.

---

## 3. Taking care of myself (Health habits)

*Aligned DB: physical development, self-care, movement.*

- Takes themselves to the toilet on their own. *(moved here from your Social list for curriculum fit)*
- Displays sportsmanship.
- Runs with increasing speed and control.
- Listens and responds to instructions *(also relevant to listening; primary home here: physical / routines in class).*
- Plays well in a group but finds sharing playing materials hard.
- Handles play materials with care.
- Takes up a lead role.
- Loves cheering for and encouraging friends.
- Participates fully and climbs with alternating feet.
- Loves PE lessons and participates fully. *(you listed this under Creative; it sits strongly under physical / health — keep in one place: here.)*

---

## 4. Development and using mathematical concepts

*Aligned DB subsection: `numeracy`.*

- Matches numbers to pictures and recognizes numerals.
- Writes numbers 0–20 (can try 6–20 with teacher’s help).
- Familiar with days of the week.
- Can tell some colors and name most taught shapes.
- Able to add numbers 1–10.

---

## 5. Development and using language (Language II)

*Aligned DB subsections: `creative`, `reading_phonics`, `writing`, `speaking_listening` (all under `language_development` in the detailed table).*

### Creative / expressive

- Uses colors freely and balances colors accordingly.
- Shades within a given space.
- Sometimes chooses dull colors or colors outside the given space.
- Draws big, self-explanatory pictures and talks about creations.
- Drawing skills are still developing.
- Sings on top of his voice and dances to the tune/rhythm.

### Reading & phonics

- Able to read and interpret a given sentence on his own.
- Recognizes sounds with pictures.
- Can write a sentence about a picture.
- Can blend three-letter words and has learnt to read words of sounds.
- Can tell the initial sound for a picture.
- Can read and write correct words/sounds during dictation.
- Blending skills are behind.
- Can trace through sounds with interest but sometimes forgets learnt sounds.

### Writing

- Grip on a pencil or crayon is firm.
- Forms circular sounds better.
- Writes and places sounds and numbers well.
- Can copy correctly from a given source.
- Can copy from the chalkboard but not always accurately; still misses some letters while copying.
- Finishes work in time but needs to pace up.

### Speaking and listening

- Follows simple instructions and listens to short stories.
- Asks and answers simple questions.
- Has parallel talks with friends.
- Understands English but is just beginning to speak it; speaks “scattered” or improvised English.
- Uses magic words with ease.
- Relays messages correctly or partially.

---

## Cross-reference: your original section headers → five learning areas

| Your original heading | Maps primarily to |
|----------------------|-------------------|
| Social Development | **1 — Relating with others (Social development)** |
| Physical Development | **3 — Taking care of myself (Health habits)** |
| Creative Activities | **5 — Development and using language (Language II)** (creative band) |
| Academic Development: Reading & Phonics | **5 — Language II** (reading/phonics) |
| Academic Development: Writing | **5 — Language II** (writing) |
| Speaking and Listening | **5 — Language II** (speaking/listening) |
| Numeracy & Environmental Studies | Split: **4 — Mathematical concepts** (numeracy bullets) and **2 — Language I / environment** (theme transport line) |

---

## Next step (for logic / Supabase)

- Tie each bullet to an `item_key` (or new key) in `nursery_detailed_observation_items`, or add rows via **additive migration** only.

This file is the working alignment document until you adjust any line.

---

## Rating → catalogue columns (implemented)

Holistic exam input stores four levels per skill (`pre_primary_holistic_grade` in `exam_results.nursery_skill_performance` JSON). The detailed comment report reads text from `nursery_detailed_observation_items`.

| Teacher rating (stored enum) | Column used for paragraph text |
|-----------------------------|--------------------------------|
| VERY_GOOD | `response_yes` |
| GOOD | `response_good` (falls back to `response_tries` if null) |
| NEEDS_IMPROVEMENT | `response_needs_improvement` (falls back to `response_tries` if null) |
| TRIES | `response_never` |

An additive migration adds `response_good` and `response_needs_improvement` and backfills them from `response_tries` so existing rows keep working; you can edit those two columns per `item_key` later for distinct wording.

**Skill → `item_key`:** Single source of truth in code: [`src/templates/primary/prePrimaryDetailedCommentMapping.ts`](../src/templates/primary/prePrimaryDetailedCommentMapping.ts) (15 rows). Change only after review against this doc.

**Reports**

- **Colour checklist:** Same data; grid shows five learning-area rows × three skills with colour badges.
- **Detailed comments:** Five sections (same order as [`PRE_PRIMARY_HOLISTIC_STRANDS`](../src/templates/primary/prePrimaryHolisticRatings.ts)); each skill shows `prompt_text` plus the resolved response line. Missing strand or skill shows *Not recorded for this assessment.*

Teachers should enter ratings under **all five** strand subjects for a complete report; the exam UI shows progress (e.g. X/5 learning areas for this exam set).
