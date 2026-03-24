-- Detailed nursery (pre-primary): teacher observation stems are verbatim from the school list.
-- prompt_text = exact observation line; response_yes matches it (what the teacher affirms).
-- response_tries / response_never: varied teacher-style lines (same meaning; not one repeated template).

CREATE TABLE IF NOT EXISTS public.nursery_detailed_observation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strand text NOT NULL CHECK (strand IN (
    'social_development',
    'knowing_environment',
    'health_habits',
    'mathematical_concepts',
    'language_development'
  )),
  subsection text,
  sort_order int NOT NULL DEFAULT 0,
  item_key text UNIQUE NOT NULL,
  prompt_text text NOT NULL,
  response_yes text NOT NULL,
  response_tries text NOT NULL,
  response_never text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nursery_detailed_obs_strand ON public.nursery_detailed_observation_items (strand, sort_order);

COMMENT ON TABLE public.nursery_detailed_observation_items IS
  'Detailed nursery: prompt_text and response_yes are verbatim; tries/never are natural varied phrasing for each level.';

-- Global catalogue (not school-scoped). RLS can be added when wired to the app.

INSERT INTO public.nursery_detailed_observation_items
  (strand, subsection, sort_order, item_key, prompt_text, response_yes, response_tries, response_never)
VALUES

-- ========== SOCIAL DEVELOPMENT (Behaviors, emotions) — verbatim stems ==========
('social_development', 'behaviors_emotions', 10, 'social_waits_turn',
 'He/she waits for the turn.',
 'He/she waits for the turn.',
 'Often remembers to wait; still learning to do it every time.',
 'Turn-taking is still a challenge on many occasions.'),

('social_development', 'behaviors_emotions', 20, 'social_calm_toilet_turn',
 'Calm, wait for their turn to be told to take herself to the toilet on own.',
 'Calm, wait for their turn to be told to take herself to the toilet on own.',
 'Calmer at times; toilet routine is improving with reminders.',
 'Toilet independence and calm waiting still need a lot of guidance.'),

('social_development', 'behaviors_emotions', 30, 'social_simple_independent_skills',
 'He/she performs simple independent skills.',
 'He/she performs simple independent skills.',
 'Does more on own; needs a prompt now and then.',
 'Independent skills are only just beginning to show.'),

('social_development', 'behaviors_emotions', 40, 'social_conveys_needs_teacher',
 'He/she conveys personal needs to the teacher (they realize).',
 'He/she conveys personal needs to the teacher (they realize).',
 'Sometimes lets the teacher know; messages are getting clearer.',
 'Still relies heavily on the teacher to notice what he/she needs.'),

('social_development', 'behaviors_emotions', 50, 'social_observes_rules',
 'He/she observes and obeys rules.',
 'He/she observes and obeys rules.',
 'Usually follows rules; slips when excited or tired.',
 'Rules are not yet understood or followed in a steady way.'),

('social_development', 'behaviors_emotions', 60, 'social_confidence_settle',
 'He/she needs to pick confidence; he needs to settle in class.',
 'He/she needs to pick confidence; he needs to settle in class.',
 'A little more settled; confidence is growing slowly.',
 'Still shy or unsettled; needs more time to feel safe in class.'),

('social_development', 'behaviors_emotions', 70, 'social_stand_talk_politely',
 'Can stand up and talk without fear about anything to anyone politely.',
 'Can stand up and talk without fear about anything to anyone politely.',
 'Speaks up with encouragement; sometimes still hesitant.',
 'Still quiet or fearful when speaking in front of others.'),

('social_development', 'behaviors_emotions', 80, 'social_sometimes_fights_friends',
 'He sometimes fights friends.',
 'He sometimes fights friends.',
 'Fewer conflicts lately; learning to use words instead of hands.',
 'Fights or rough play with peers still happen too often.'),

('social_development', 'behaviors_emotions', 90, 'social_participates_makes_friends',
 'He participates in discussions and makes friends quickly.',
 'He participates in discussions and makes friends quickly.',
 'Joins in sometimes; friendships are forming at a natural pace.',
 'Keeps to self or finds group talk and friendships difficult.'),

('social_development', 'behaviors_emotions', 100, 'social_sympathetic',
 'He is sympathetic to friends.',
 'He is sympathetic to friends.',
 'Beginning to notice when friends are upset or need help.',
 'Rarely shows concern for others'' feelings in the moment.'),

('social_development', 'behaviors_emotions', 110, 'social_moods_unstable',
 'Moods are unstable/swing.',
 'Moods are unstable/swing.',
 'Moods settle faster with routine; good days and harder days.',
 'Mood swings still disrupt work or play very often.'),

('social_development', 'behaviors_emotions', 120, 'social_easily_irritable',
 'Is easily irritable (gets annoyed quickly).',
 'Is easily irritable (gets annoyed quickly).',
 'Calms down with help; still quick to get annoyed.',
 'Gets annoyed very easily most of the time.'),

('social_development', 'behaviors_emotions', 130, 'social_sometimes_not_cooperative',
 'He/she is sometimes not co-operative.',
 'He/she is sometimes not co-operative.',
 'Co-operates on good days; needs a gentle reminder.',
 'Often refuses to join in or co-operate with the group.'),

('social_development', 'behaviors_emotions', 140, 'social_loves_class_activities',
 'He/she loves participating in all class activities.',
 'He/she loves participating in all class activities.',
 'Joins in most activities; occasionally distracted or shy.',
 'Rarely shows enthusiasm for whole-class tasks.'),

-- ========== ENVIRONMENTAL STUDIES — Theme: Transport ==========
('knowing_environment', 'theme_transport', 10, 'env_theme_transport',
 'Theme: Transport.',
 'Theme: Transport.',
 'Talks about buses, cars, and similar ideas with a few prompts.',
 'Vocabulary around the Transport theme is still very thin.'),

('knowing_environment', 'theme_transport', 20, 'env_define_theme_transport',
 'Can define the theme and means of transport.',
 'Can define the theme and means of transport.',
 'Can give a simple idea of what transport means; wording is still simple.',
 'Cannot yet explain the theme or means of transport clearly.'),

('knowing_environment', 'theme_transport', 30, 'env_recite_rhymes_alone',
 'Can recite all the taught rhymes alone.',
 'Can recite all the taught rhymes alone.',
 'Recites most of a rhyme; needs the first word or line to start.',
 'Rhymes are not yet recited confidently on their own.'),

-- ========== PHYSICAL DEVELOPMENT ==========
('health_habits', NULL, 10, 'phys_sportsmanship_speed',
 'Displays sportsmanship and runs with increasing speed and control.',
 'Displays sportsmanship and runs with increasing speed and control.',
 'Joins in games; speed and control are improving with practice.',
 'Games and running still look unsafe or poorly controlled.'),

('health_habits', NULL, 20, 'phys_listens_responds_instructions',
 'Listens and responds to instructions.',
 'Listens and responds to instructions.',
 'Listens most of the time; may need a repeat or a gesture.',
 'Often ignores or misunderstands instructions during play.'),

('health_habits', NULL, 30, 'phys_plays_group',
 'Plays well in a group.',
 'Plays well in a group.',
 'Plays well with support; sometimes prefers to play alone.',
 'Group play is still difficult—often plays alone or on the edge.'),

('health_habits', NULL, 40, 'phys_sharing_hard_swinging',
 'He finds sharing playing materials hard (swinging).',
 'He finds sharing playing materials hard (swinging).',
 'Shares sometimes; swings and favourite toys are still flashpoints.',
 'Sharing play materials is still very hard most of the time.'),

('health_habits', NULL, 50, 'phys_handles_materials_care',
 'Handles play materials with care.',
 'Handles play materials with care.',
 'Usually careful; an odd rough moment when in a hurry.',
 'Materials are often dropped or handled roughly.'),

('health_habits', NULL, 60, 'phys_lead_role',
 'He takes up a lead role.',
 'He takes up a lead role.',
 'Leads in small games; follows others in bigger groups.',
 'Does not yet take a lead role in play.'),

('health_habits', NULL, 70, 'phys_interest_class_activities',
 'He takes a lot of interest in class activities.',
 'He takes a lot of interest in class activities.',
 'Interested in some activities; not every task holds attention.',
 'Shows little interest in class or movement activities.'),

('health_habits', NULL, 80, 'phys_cheers_encourages_friends',
 'He loves cheering friends and encouraging them.',
 'He loves cheering friends and encouraging them.',
 'Sometimes cheers peers; praise for others is growing.',
 'Rarely encourages or cheers for friends.'),

('health_habits', NULL, 90, 'phys_participates_climbs_alternate_feet',
 'Participates fully always; climbs fully with alternative feet.',
 'Participates fully always; climbs fully with alternative feet.',
 'Joins in well; footwork on climbing is still uneven at times.',
 'Avoids climbing or joins in only briefly.'),

-- ========== CREATIVE ACTIVITIES ==========
('language_development', 'creative', 10, 'cr_uses_colors_freely',
 'He uses the colors freely.',
 'He uses the colors freely.',
 'Uses colors more boldly; still a little cautious on some days.',
 'Hardly explores the color range or sticks to one safe color.'),

('language_development', 'creative', 20, 'cr_draws_talks_creations',
 'Draws and talks about his/her creations.',
 'Draws and talks about his/her creations.',
 'Says a few words about the picture; confidence is growing.',
 'Draws but rarely explains what he/she drew.'),

('language_development', 'creative', 30, 'cr_bright_balanced_colors',
 'Uses bright colors and balances colors accordingly.',
 'Uses bright colors and balances colors accordingly.',
 'Bright colors appear; balance across the page is still uneven.',
 'Color choices still look flat or muddled.'),

('language_development', 'creative', 40, 'cr_shades_within_space',
 'Shades within a given space.',
 'Shades within a given space.',
 'Shades most of the space; edges are still a bit rough.',
 'Shading stays messy or spills outside the lines.'),

('language_development', 'creative', 50, 'cr_still_small_pictures',
 'Still draws small pictures.',
 'Still draws small pictures.',
 'Pictures are slowly getting bigger; detail is inching forward.',
 'Pictures stay very small and faint.'),

('language_development', 'creative', 60, 'cr_tidy_craft',
 'Does tidy work with craft.',
 'Does tidy work with craft.',
 'Neat on a good day; glue and scraps can spill.',
 'Craft work is messy or left unfinished.'),

('language_development', 'creative', 70, 'cr_sings_dances',
 'He sings on top of his voice and dances to the tune/rhythm.',
 'He sings on top of his voice and dances to the tune/rhythm.',
 'Joins singing and dancing; sometimes holds back.',
 'Holds back from singing or dancing in class.'),

('language_development', 'creative', 80, 'cr_loves_pe_full',
 'Loves PE lessons and participates fully.',
 'Loves PE lessons and participates fully.',
 'Joins PE most days; needs a reminder now and then.',
 'Rarely takes part fully in PE.'),

('language_development', 'creative', 90, 'cr_drawing_skills_developing',
 'Drawing skills are still developing.',
 'Drawing skills are still developing.',
 'Drawing moves forward a little each week.',
 'Drawing is still weak for this stage.'),

-- ========== ACADEMIC — Numeracy ==========
('mathematical_concepts', 'numeracy', 10, 'num_match_recognize',
 'Matches numbers to pictures and recognizes numerals.',
 'Matches numbers to pictures and recognizes numerals.',
 'Gets matches right with help; numeral names are improving.',
 'Still confuses numbers and pictures more often than peers.'),

('mathematical_concepts', 'numeracy', 20, 'num_writes_0_20',
 'Writes numbers 0-20.',
 'Writes numbers 0-20.',
 'Forms many numerals correctly; a few reversals remain.',
 'Numerals 0–20 are still unreliable or incorrect on paper.'),

('mathematical_concepts', 'numeracy', 30, 'num_try_6_20_help',
 'Can try numbers 6-20 with teacher''s help.',
 'Can try numbers 6-20 with teacher''s help.',
 'Tries with teacher support; 6–20 alone is still shaky.',
 'Numbers 6–20 without help are still not secure.'),

('mathematical_concepts', 'numeracy', 40, 'num_days_week',
 'Familiar with days of the week.',
 'Familiar with days of the week.',
 'Knows some days; order is still mixed up.',
 'Days of the week are not yet known in sequence.'),

('mathematical_concepts', 'numeracy', 50, 'num_colors_shapes',
 'Can tell some colors and name most taught shapes.',
 'Can tell some colors and name most taught shapes.',
 'Names some colors and shapes; misses a few when tired.',
 'Colors and shapes taught in class are still vague.'),

('mathematical_concepts', 'numeracy', 60, 'num_add_1_10',
 'Is able to add numbers 1-10.',
 'Is able to add numbers 1-10.',
 'Adds with fingers or counters; mental sums are still hard.',
 'Addition 1–10 is still not reliable on its own.'),

-- ========== ACADEMIC — Reading & Phonics ==========
('language_development', 'reading_phonics', 10, 'read_interpret_sentence',
 'Able to read and can interpret a sentence on his own.',
 'Able to read and can interpret a sentence on his own.',
 'Reads with support; meaning is sometimes guessed.',
 'Cannot yet read or interpret a sentence reliably on his own.'),

('language_development', 'reading_phonics', 20, 'read_recognizes_sounds_pictures',
 'Recognizes sounds with pictures.',
 'Recognizes sounds with pictures.',
 'Links most sounds to pictures; a few slip through.',
 'Sound–picture links are still weak.'),

('language_development', 'reading_phonics', 30, 'read_blend_three_letter',
 'Can blend three-letter words and learnt to read words of sounds.',
 'Can blend three-letter words and learnt to read words of sounds.',
 'Blends with a cue; word reading is still slow.',
 'Three-letter blending and word reading are still not secure.'),

('language_development', 'reading_phonics', 40, 'read_initial_sound_picture',
 'Can tell initial sound for the picture.',
 'Can tell initial sound for the picture.',
 'Gets initial sound often; not every picture yet.',
 'Initial sound for a picture is still a guess.'),

('language_development', 'reading_phonics', 50, 'read_write_dictation',
 'Can read and write correct words/sounds during dictation.',
 'Can read and write correct words/sounds during dictation.',
 'Mostly correct in dictation; a few slips when tired.',
 'Dictation mistakes are still frequent.'),

('language_development', 'reading_phonics', 60, 'read_blending_behind',
 'Blending skills are behind.',
 'Blending skills are behind.',
 'Blending is catching up slowly with extra practice.',
 'Blending remains behind peers.'),

('language_development', 'reading_phonics', 70, 'read_match_pictures_sounds_words',
 'Can match pictures to sounds/words correctly.',
 'Can match pictures to sounds/words correctly.',
 'Matches most items; odd errors when tired or rushed.',
 'Pictures to sounds/words still mismatch too often.'),

('language_development', 'reading_phonics', 80, 'read_forgets_sounds',
 'Sometimes forgets learnt sounds.',
 'Sometimes forgets learnt sounds.',
 'Remembers sounds after a quick review.',
 'Learnt sounds slip away too often.'),

('language_development', 'reading_phonics', 90, 'read_form_match_sounds',
 'Can form sounds correctly and matches sounds to sounds.',
 'Can form sounds correctly and matches sounds to sounds.',
 'Forms many sounds well; matching still needs care.',
 'Sound formation and matching are still shaky.'),

-- ========== ACADEMIC — Writing ==========
('language_development', 'writing', 10, 'write_circular_sounds',
 'Forms circular sounds better.',
 'Forms circular sounds better.',
 'Circular forms are improving; some wobble remains.',
 'Circular sounds still look uneven or wrong.'),

('language_development', 'writing', 20, 'write_places_sounds_numbers',
 'Writes and places sounds and numbers well.',
 'Writes and places sounds and numbers well.',
 'Placement is mostly right; spacing can wobble.',
 'Sounds and numbers still sit in the wrong place too often.'),

('language_development', 'writing', 30, 'write_copy_source',
 'Can copy correctly from the given source.',
 'Can copy correctly from the given source.',
 'Copies well with the model beside the page.',
 'Copying from the given source is still inaccurate.'),

('language_development', 'writing', 40, 'write_grip_firm',
 'Grip on a pencil or crayon is firm.',
 'Grip on a pencil or crayon is firm.',
 'Grip is firm enough; a little tiredness on long tasks.',
 'Pencil grip is still weak or uncomfortable.'),

('language_development', 'writing', 50, 'write_copy_board_inaccurate',
 'Can copy from the chalkboard but not accurately; still misses some letters while copying.',
 'Can copy from the chalkboard but not accurately; still misses some letters while copying.',
 'Board copy is improving; still misses letters.',
 'Chalkboard copy remains inaccurate and misses letters.'),

('language_development', 'writing', 60, 'write_clear_pictures_finishes_time',
 'Draws clear pictures and finishes his work in time.',
 'Draws clear pictures and finishes his work in time.',
 'Finishes most of the time; pictures are clear.',
 'Work often unfinished or rushed.'),

('language_development', 'writing', 70, 'write_needs_pace_up',
 'He needs to pace up.',
 'He needs to pace up.',
 'Working a little faster; still needs time.',
 'Work pace is still too slow for the class.'),

-- ========== ACADEMIC — Speaking & Listening ==========
('language_development', 'speaking_listening', 10, 'sl_instructions_stories',
 'Follows simple instructions and listens to simple short stories.',
 'Follows simple instructions and listens to simple short stories.',
 'Follows instructions when they are short; long stories lose attention.',
 'Instructions and listening still need a lot of repetition.'),

('language_development', 'speaking_listening', 20, 'sl_questions_answers',
 'Asks and answers simple questions.',
 'Asks and answers simple questions.',
 'Answers simple questions; asks in one or two words.',
 'Question-and-answer in English is still hard.'),

('language_development', 'speaking_listening', 30, 'sl_parallel_talks',
 'Has parallel talks with friends.',
 'Has parallel talks with friends.',
 'Talks with friends during play; may need reminders.',
 'Parallel talk with peers is still rare.'),

('language_development', 'speaking_listening', 40, 'sl_understands_english_speaking_yet',
 'Understands English language but speaking yet.',
 'Understands English language but speaking yet.',
 'Understands a lot; speaking is still limited.',
 'Speaking English is still not happening much.'),

('language_development', 'speaking_listening', 50, 'sl_beginning_english',
 'Beginning to speak some English; speaks scattered/improvised English.',
 'Beginning to speak some English; speaks scattered/improvised English.',
 'Says a few English phrases; still scattered.',
 'English output is still very minimal.'),

('language_development', 'speaking_listening', 60, 'sl_magic_words',
 'Uses magic words with ease.',
 'Uses magic words with ease.',
 'Uses please and thank you often; forgets when busy.',
 'Polite words are still not used on their own.'),

-- ========== GENERAL COMMENT ==========
('language_development', 'general_comment', 1000, 'gc_improve_better',
 'Able to improve and can do better.',
 'Able to improve and can do better.',
 'Small steps are visible; can build on this.',
 'Progress is still slow; more support is needed.'),

('language_development', 'general_comment', 1010, 'gc_opened_promising',
 'Has opened up this term; promising.',
 'Has opened up this term; promising.',
 'Opening up more; promising signs this term.',
 'Still quiet or withdrawn; needs more time to bloom.'),

('language_development', 'general_comment', 1020, 'gc_much_effort_needed',
 'Much effort needed.',
 'Much effort needed.',
 'More effort is showing; habits are forming.',
 'A great deal more work is still required.');
