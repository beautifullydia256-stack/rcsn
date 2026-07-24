-- Pilot grounding data: Primary 1, Term 2, Theme 5 "Weather" — extracted and verified against
-- the official NCDC "National Primary School Curriculum for Uganda, Primary 1" document, and
-- cross-checked against real scheme-of-work examples from Ugandan schools (Greenhill Academy,
-- and a second independent P.1 scheme that itself cites this same official curriculum by page
-- number). This is a deliberately small first pilot to prove the grounding approach before
-- seeding further classes/subjects/terms in later migrations.

INSERT INTO public.curriculum_topics
  (education_level, class_name, subject, term, sequence_order, theme, sub_theme,
   learning_outcome, content_summary, suggested_competences, suggested_methods,
   suggested_life_skills, suggested_materials, source_reference, verified)
VALUES
  (
    'primary', 'P1', NULL, '2', 1, 'Weather', 'Elements and Types of Weather',
    'The learner is able to know, appreciate and manage weather to improve production and the economy.',
    'Elements of weather: sun, rain, clouds, wind. Types of weather: rainy, cloudy, sunny, windy.',
    'Naming and describing elements and types of weather; counting 1-40 and writing number symbols (1-30); adding numbers with sum less than 20 vertically without carrying; reading and writing number names 1-5; vocabulary (sun, rain, wind, cloud(s), water, hot, shine(ing), rain(ing), cold, blow(ing), rainy, cloudy, sunny, windy); using structures like "Is it...?", "Yes, it is / No, it is not", "What is the weather like?".',
    'Listening to stories, matching, storytelling, class discussion, role play, singing, reciting rhymes, question and answer, drawing and labelling.',
    'Effective communication, Decision-making, Problem-solving, Self-awareness, Appreciation, Creative thinking, Critical thinking, Interpersonal relationships, Negotiation, Assertiveness.',
    'Weather chart, story books, chalkboard illustrations, textbooks.',
    'The National Primary School Curriculum for Uganda, Primary 1, Theme 5: Weather (5.1), page 25.',
    true
  ),
  (
    'primary', 'P1', NULL, '2', 2, 'Weather', 'Activities for different seasons',
    'The learner is able to know, appreciate and manage weather to improve production and the economy.',
    'Activities: preparing land, planting, watering plants, weeding, harvesting, drying seeds and crops, marketing. Tools: axe, hoe, slasher, panga, watering can, spade, knife, rake, basket, wheelbarrow.',
    'Sorting and sequencing activities and tools; drawing shapes (triangles, rectangles); counting up to 50; writing/reading number symbols and names 1-30; recognising place value (tens and ones); naming activities and tools; asking and answering questions about seasonal activities; reading and writing sentences about farming activities.',
    'Question and answer, storytelling, class discussion, demonstration, role play, drawing, colouring.',
    'Love, Responsibility, Co-operation, Endurance, Sharing, Care, Patience, Effective communication, Creative thinking, Decision-making, Problem-solving.',
    'Real tools (or pictures of them), farm produce samples, picture cards.',
    'The National Primary School Curriculum for Uganda, Primary 1, Theme 5: Weather (5.2), pages 25-26.',
    true
  ),
  (
    'primary', 'P1', NULL, '2', 3, 'Weather', 'Effects and management of weather',
    'The learner is able to know, appreciate and manage weather to improve production and the economy.',
    'Effects: sweat, getting wet, slides, floods, storms, soil erosion, drought. Management: appropriate clothing, mulching, watering, planting trees, wind breakers, water harvesting.',
    'Forming sets and matching; adding with sum less than 20 horizontally and vertically without carrying; counting in 2s; multiplying by 2 as repeated addition; recognising place value (tens and ones); naming and talking about effects and management of weather; identifying wind-breakers; identifying singular and plural words; using structures like "What is this/that?", "What do you use ... for?", "I use ... for ...ing".',
    'Storytelling, class discussion, question and answer, singing/signing, role play, modelling, drawing, shading, colouring.',
    'Responsibility, Sharing, Acceptance, Effective communication, Creative thinking, Decision-making, Problem-solving, Critical thinking, Self-esteem.',
    'Pictures/charts of floods, drought, soil erosion; clothing samples; seedlings.',
    'The National Primary School Curriculum for Uganda, Primary 1, Theme 5: Weather (5.3), page 26.',
    true
  );

INSERT INTO public.curriculum_scheme_examples
  (education_level, class_name, subject, term, theme, source_school, example_entries, verified)
VALUES
  (
    'primary', 'P1', NULL, '2', 'Weather', 'Greenhill Academy',
    '[
      {
        "week_number": 2,
        "period_number": 1,
        "theme": "Weather",
        "sub_theme": "Elements and Types of Weather",
        "content": "What is weather? Weather makers/elements of weather",
        "competences": "Describes weather. Draws and names elements of weather",
        "methods": "Story telling, class discussion, role play",
        "activity": "Describing weather; drawing and naming elements of weather",
        "life_skills": "Critical thinking, Creative thinking, Confidence, Appreciation",
        "materials": "Weather chart, text books, chalkboard illustrations",
        "reference": "MK Integrated Science Bk 2 pgs 52-54",
        "remarks": ""
      }
    ]'::jsonb,
    true
  );
