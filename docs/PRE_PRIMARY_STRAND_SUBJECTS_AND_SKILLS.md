# Pre-primary (Baby / Middle / Top): strand subjects and skills

Canonical source in code: [`src/templates/primary/prePrimaryHolisticRatings.ts`](../src/templates/primary/prePrimaryHolisticRatings.ts) (`PRE_PRIMARY_HOLISTIC_STRANDS`).

- **Strand subject** — what you pick in the exam-results subject dropdown (exact string; stored as `exam_results.subject`).
- **Skill** — one of three columns in the holistic grid for that subject. **`skill.key`** is what appears in `exam_results.nursery_skill_performance` JSON.

Optional: **`detailed_comment_item_key`** links a skill to one row in `nursery_detailed_observation_items` for report prose ([`prePrimaryDetailedCommentMapping.ts`](../src/templates/primary/prePrimaryDetailedCommentMapping.ts)).

---

## 1. Relating with others (Social development)

**Subject (exact):** `Relating with others (Social development)`

| # | Skill key | Skill label (UI column) | Detailed comment `item_key` |
|---|-----------|-------------------------|----------------------------|
| 1 | `relating_with_others` | Relating with others | `social_observes_rules` |
| 2 | `games` | Games | `social_loves_class_activities` |
| 3 | `helping` | Helping | `social_sympathetic` |

### Notes

- 

---

## 2. Relating and knowing my environment (Language I)

**Subject (exact):** `Relating and knowing my environment (Language I)`

| # | Skill key | Skill label (UI column) | Detailed comment `item_key` |
|---|-----------|-------------------------|----------------------------|
| 1 | `naming` | Naming | `env_define_theme_transport` |
| 2 | `cleanliness` | Cleanliness | `env_recite_rhymes_alone` |
| 3 | `caring_for_the_environment` | Caring for the environment | `env_theme_transport` |

### Notes

- 

---

## 3. Taking care of myself (Health habits)

**Subject (exact):** `Taking care of myself (Health habits)`

| # | Skill key | Skill label (UI column) | Detailed comment `item_key` |
|---|-----------|-------------------------|----------------------------|
| 1 | `taking_care_of_myself` | Taking care of myself | `phys_interest_class_activities` |
| 2 | `toilet_habits` | Toilet habits | `social_calm_toilet_turn` |
| 3 | `body_hygiene` | Body hygiene | `phys_handles_materials_care` |

### Notes

- 

---

## 4. Development and using mathematical concepts

**Subject (exact):** `Development and using mathematical concepts`

| # | Skill key | Skill label (UI column) | Detailed comment `item_key` |
|---|-----------|-------------------------|----------------------------|
| 1 | `reciting_numbers` | Reciting numbers | `num_match_recognize` |
| 2 | `counting_concepts` | Counting concepts | `num_colors_shapes` |
| 3 | `addition_concepts` | Addition concepts | `num_add_1_10` |

### Notes

- 

---

## 5. Development and using language (Language II)

**Subject (exact):** `Development and using language (Language II)`

| # | Skill key | Skill label (UI column) | Detailed comment `item_key` |
|---|-----------|-------------------------|----------------------------|
| 1 | `development_and_using_language` | Development and using language | `sl_instructions_stories` |
| 2 | `reading` | Reading | `read_interpret_sentence` |
| 3 | `attendance` | Attendance | `sl_questions_answers` |

### Notes

- 

---

## Summary

| Strand # | Strand subject | Number of skills |
|----------|----------------|------------------|
| 1 | Relating with others (Social development) | 3 |
| 2 | Relating and knowing my environment (Language I) | 3 |
| 3 | Taking care of myself (Health habits) | 3 |
| 4 | Development and using mathematical concepts | 3 |
| 5 | Development and using language (Language II) | 3 |
| **Total** | **5 strand subjects** | **15 skills** |

---

## Related docs

- [`NURSERY_LEARNING_AREAS_COMMENT_ALIGNMENT.md`](./NURSERY_LEARNING_AREAS_COMMENT_ALIGNMENT.md) — curriculum alignment and observation stems.
- [`COMMENTS_AND_REMARKS_INVENTORY.md`](./COMMENTS_AND_REMARKS_INVENTORY.md) — where comments live in DB and reports.
