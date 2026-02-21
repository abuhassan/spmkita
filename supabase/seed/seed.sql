-- ============================================
-- SPMKita Seed Data
-- ============================================

-- SUBJECTS
insert into public.subjects (code, name_en, name_bm, icon, form_levels, is_active, display_order) values
  ('MATH', 'Mathematics', 'Matematik', '🔢', '{1,2,3,4,5}', true, 1),
  ('ADDMATH', 'Additional Mathematics', 'Matematik Tambahan', '📐', '{4,5}', false, 2),
  ('SCIENCE', 'Science', 'Sains', '🔬', '{1,2,3}', false, 3),
  ('PHYSICS', 'Physics', 'Fizik', '⚡', '{4,5}', false, 4),
  ('CHEMISTRY', 'Chemistry', 'Kimia', '🧪', '{4,5}', false, 5),
  ('BIOLOGY', 'Biology', 'Biologi', '🧬', '{4,5}', false, 6),
  ('BM', 'Bahasa Melayu', 'Bahasa Melayu', '🇲🇾', '{1,2,3,4,5}', false, 7),
  ('ENGLISH', 'English', 'Bahasa Inggeris', '🇬🇧', '{1,2,3,4,5}', false, 8),
  ('SEJARAH', 'History', 'Sejarah', '📜', '{1,2,3,4,5}', false, 9);

-- MATH TOPICS - Form 1
insert into public.topics (subject_id, form_level, chapter_number, name_en, name_bm, display_order)
select s.id, 1, v.ch, v.name_en, v.name_bm, v.ch
from public.subjects s,
(values
  (1, 'Rational Numbers', 'Nombor Nisbah'),
  (2, 'Factors and Multiples', 'Faktor dan Gandaan'),
  (3, 'Squares, Square Roots, Cubes and Cube Roots', 'Kuasa Dua, Punca Kuasa Dua, Kuasa Tiga dan Punca Kuasa Tiga'),
  (4, 'Ratios, Rates and Proportions', 'Nisbah, Kadar dan Kadaran'),
  (5, 'Algebraic Expressions', 'Ungkapan Algebra'),
  (6, 'Linear Equations', 'Persamaan Linear'),
  (7, 'Linear Inequalities', 'Ketaksamaan Linear'),
  (8, 'Lines and Angles', 'Garis dan Sudut'),
  (9, 'Basic Polygons', 'Poligon Asas'),
  (10, 'Perimeter and Area', 'Perimeter dan Luas'),
  (11, 'Introduction to Set', 'Pengenalan Set'),
  (12, 'Data Handling', 'Pengendalian Data')
) as v(ch, name_en, name_bm)
where s.code = 'MATH';

-- MATH TOPICS - Form 2
insert into public.topics (subject_id, form_level, chapter_number, name_en, name_bm, display_order)
select s.id, 2, v.ch, v.name_en, v.name_bm, v.ch
from public.subjects s,
(values
  (1, 'Patterns and Sequences', 'Pola dan Jujukan'),
  (2, 'Factorisation and Algebraic Fractions', 'Pemfaktoran dan Pecahan Algebra'),
  (3, 'Algebraic Formulae', 'Rumus Algebra'),
  (4, 'Polygons', 'Poligon'),
  (5, 'Circles', 'Bulatan'),
  (6, 'Three-Dimensional Shapes', 'Bentuk Tiga Dimensi'),
  (7, 'Coordinates', 'Koordinat'),
  (8, 'Graphs of Functions', 'Graf Fungsi'),
  (9, 'Speed and Acceleration', 'Laju dan Pecutan'),
  (10, 'Gradient of a Straight Line', 'Kecerunan Garis Lurus'),
  (11, 'Isometric Transformations', 'Transformasi Isometri'),
  (12, 'Measures of Central Tendency', 'Sukatan Kecenderungan Memusat'),
  (13, 'Simple Probability', 'Kebarangkalian Mudah')
) as v(ch, name_en, name_bm)
where s.code = 'MATH';

-- MATH TOPICS - Form 3
insert into public.topics (subject_id, form_level, chapter_number, name_en, name_bm, display_order)
select s.id, 3, v.ch, v.name_en, v.name_bm, v.ch
from public.subjects s,
(values
  (1, 'Indices', 'Indeks'),
  (2, 'Standard Form', 'Bentuk Piawai'),
  (3, 'Consumer Mathematics', 'Matematik Pengguna'),
  (4, 'Scale Drawings', 'Lukisan Berskala'),
  (5, 'Trigonometric Ratios', 'Nisbah Trigonometri'),
  (6, 'Angles and Tangent of Circles', 'Sudut dan Tangen Bulatan'),
  (7, 'Plans and Elevations', 'Pelan dan Dongakan'),
  (8, 'Loci in Two Dimensions', 'Lokus dalam Dua Dimensi'),
  (9, 'Straight Lines', 'Garis Lurus')
) as v(ch, name_en, name_bm)
where s.code = 'MATH';

-- MATH TOPICS - Form 4
insert into public.topics (subject_id, form_level, chapter_number, name_en, name_bm, display_order)
select s.id, 4, v.ch, v.name_en, v.name_bm, v.ch
from public.subjects s,
(values
  (1, 'Quadratic Functions and Equations', 'Fungsi dan Persamaan Kuadratik'),
  (2, 'Number Bases', 'Asas Nombor'),
  (3, 'Logical Reasoning', 'Penaakulan Logik'),
  (4, 'Operations on Sets', 'Operasi ke atas Set'),
  (5, 'Network in Graph Theory', 'Rangkaian dalam Teori Graf'),
  (6, 'Linear Inequalities in Two Variables', 'Ketaksamaan Linear dalam Dua Pemboleh Ubah'),
  (7, 'Graphs of Motion', 'Graf Gerakan'),
  (8, 'Measures of Dispersion', 'Sukatan Serakan'),
  (9, 'Probability of Combined Events', 'Kebarangkalian Peristiwa Bergabung')
) as v(ch, name_en, name_bm)
where s.code = 'MATH';

-- MATH TOPICS - Form 5
insert into public.topics (subject_id, form_level, chapter_number, name_en, name_bm, display_order)
select s.id, 5, v.ch, v.name_en, v.name_bm, v.ch
from public.subjects s,
(values
  (1, 'Circular Measure', 'Sukatan Membulat'),
  (2, 'Differentiation', 'Pembezaan'),
  (3, 'Integration', 'Pengamiran'),
  (4, 'Permutation and Combination', 'Pilih Atur dan Gabungan'),
  (5, 'Probability Distribution', 'Taburan Kebarangkalian'),
  (6, 'Trigonometric Functions', 'Fungsi Trigonometri'),
  (7, 'Linear Programming', 'Pengaturcaraan Linear'),
  (8, 'Kinematics of Linear Motion', 'Kinematik Gerakan Linear')
) as v(ch, name_en, name_bm)
where s.code = 'MATH';

-- SAMPLE QUESTIONS - Form 1 Chapter 1 (Rational Numbers)
insert into public.questions (topic_id, subject_id, form_level, difficulty, question_type, question_text_en, question_text_bm, options_en, options_bm, correct_answer, explanation_en, explanation_bm, tags)
select 
  t.id, s.id, 1, v.diff, 'mcq', v.q_en, v.q_bm, v.opt_en::jsonb, v.opt_bm::jsonb, v.ans, v.exp_en, v.exp_bm, v.tags::text[]
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  (1,
   'What is the value of -3 + 7?',
   'Berapakah nilai -3 + 7?',
   '[{"key":"A","text":"4"},{"key":"B","text":"-4"},{"key":"C","text":"10"},{"key":"D","text":"-10"}]',
   '[{"key":"A","text":"4"},{"key":"B","text":"-4"},{"key":"C","text":"10"},{"key":"D","text":"-10"}]',
   'A',
   'When adding a negative and positive number, subtract the smaller absolute value from the larger: 7 - 3 = 4. Since 7 is positive and larger, the answer is positive.',
   'Apabila menambah nombor negatif dan positif, tolak nilai mutlak yang lebih kecil daripada yang lebih besar: 7 - 3 = 4. Oleh kerana 7 adalah positif dan lebih besar, jawapannya adalah positif.',
   '{integers,addition,negative-numbers}'),
  (1,
   'Arrange the following in ascending order: -5, 2, -1, 0, 3',
   'Susun yang berikut dalam tertib menaik: -5, 2, -1, 0, 3',
   '[{"key":"A","text":"-5, -1, 0, 2, 3"},{"key":"B","text":"3, 2, 0, -1, -5"},{"key":"C","text":"-1, -5, 0, 2, 3"},{"key":"D","text":"0, -1, -5, 2, 3"}]',
   '[{"key":"A","text":"-5, -1, 0, 2, 3"},{"key":"B","text":"3, 2, 0, -1, -5"},{"key":"C","text":"-1, -5, 0, 2, 3"},{"key":"D","text":"0, -1, -5, 2, 3"}]',
   'A',
   'Ascending order means from smallest to largest. On a number line, numbers increase from left to right: -5 < -1 < 0 < 2 < 3.',
   'Tertib menaik bermaksud dari yang terkecil ke yang terbesar. Pada garis nombor, nombor meningkat dari kiri ke kanan: -5 < -1 < 0 < 2 < 3.',
   '{integers,ordering,number-line}'),
  (2,
   'What is (-4) × (-6)?',
   'Berapakah (-4) × (-6)?',
   '[{"key":"A","text":"24"},{"key":"B","text":"-24"},{"key":"C","text":"10"},{"key":"D","text":"-10"}]',
   '[{"key":"A","text":"24"},{"key":"B","text":"-24"},{"key":"C","text":"10"},{"key":"D","text":"-10"}]',
   'A',
   'When multiplying two negative numbers, the result is positive. (-4) × (-6) = 24.',
   'Apabila mendarab dua nombor negatif, hasilnya adalah positif. (-4) × (-6) = 24.',
   '{integers,multiplication,negative-numbers}'),
  (1,
   'Which of the following is a rational number?',
   'Yang manakah antara berikut ialah nombor nisbah?',
   '[{"key":"A","text":"√2"},{"key":"B","text":"π"},{"key":"C","text":"3/4"},{"key":"D","text":"√3"}]',
   '[{"key":"A","text":"√2"},{"key":"B","text":"π"},{"key":"C","text":"3/4"},{"key":"D","text":"√3"}]',
   'C',
   'A rational number can be expressed as a fraction p/q where q ≠ 0. 3/4 is already in fraction form. √2, π, and √3 are irrational numbers.',
   'Nombor nisbah boleh dinyatakan sebagai pecahan p/q di mana q ≠ 0. 3/4 sudah dalam bentuk pecahan. √2, π, dan √3 adalah nombor tak nisbah.',
   '{rational-numbers,definition}'),
  (2,
   'Calculate: -12 ÷ 4 + 3',
   'Hitungkan: -12 ÷ 4 + 3',
   '[{"key":"A","text":"0"},{"key":"B","text":"-6"},{"key":"C","text":"6"},{"key":"D","text":"3"}]',
   '[{"key":"A","text":"0"},{"key":"B","text":"-6"},{"key":"C","text":"6"},{"key":"D","text":"3"}]',
   'A',
   'Follow order of operations: -12 ÷ 4 = -3, then -3 + 3 = 0.',
   'Ikut tertib operasi: -12 ÷ 4 = -3, kemudian -3 + 3 = 0.',
   '{integers,division,order-of-operations}')
) as v(diff, q_en, q_bm, opt_en, opt_bm, ans, exp_en, exp_bm, tags)
where t.chapter_number = 1 and t.form_level = 1 and s.code = 'MATH';

-- SAMPLE QUESTIONS - Form 1 Chapter 5 (Algebraic Expressions)
insert into public.questions (topic_id, subject_id, form_level, difficulty, question_type, question_text_en, question_text_bm, options_en, options_bm, correct_answer, explanation_en, explanation_bm, tags)
select 
  t.id, s.id, 1, v.diff, 'mcq', v.q_en, v.q_bm, v.opt_en::jsonb, v.opt_bm::jsonb, v.ans, v.exp_en, v.exp_bm, v.tags::text[]
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  (1,
   'Simplify: 3x + 2x',
   'Permudahkan: 3x + 2x',
   '[{"key":"A","text":"5x"},{"key":"B","text":"6x"},{"key":"C","text":"5x²"},{"key":"D","text":"6"}]',
   '[{"key":"A","text":"5x"},{"key":"B","text":"6x"},{"key":"C","text":"5x²"},{"key":"D","text":"6"}]',
   'A',
   '3x and 2x are like terms (both have variable x). Add the coefficients: 3 + 2 = 5. So 3x + 2x = 5x.',
   '3x dan 2x adalah sebutan serupa (kedua-duanya mempunyai pemboleh ubah x). Tambah pekali: 3 + 2 = 5. Jadi 3x + 2x = 5x.',
   '{algebra,like-terms,simplify}'),
  (1,
   'If x = 3, find the value of 2x + 5.',
   'Jika x = 3, cari nilai 2x + 5.',
   '[{"key":"A","text":"10"},{"key":"B","text":"11"},{"key":"C","text":"8"},{"key":"D","text":"13"}]',
   '[{"key":"A","text":"10"},{"key":"B","text":"11"},{"key":"C","text":"8"},{"key":"D","text":"13"}]',
   'B',
   'Substitute x = 3: 2(3) + 5 = 6 + 5 = 11.',
   'Gantikan x = 3: 2(3) + 5 = 6 + 5 = 11.',
   '{algebra,substitution}'),
  (2,
   'Simplify: 4a + 3b - 2a + b',
   'Permudahkan: 4a + 3b - 2a + b',
   '[{"key":"A","text":"2a + 4b"},{"key":"B","text":"6a + 4b"},{"key":"C","text":"2a + 2b"},{"key":"D","text":"6ab"}]',
   '[{"key":"A","text":"2a + 4b"},{"key":"B","text":"6a + 4b"},{"key":"C","text":"2a + 2b"},{"key":"D","text":"6ab"}]',
   'A',
   'Group like terms: (4a - 2a) + (3b + b) = 2a + 4b.',
   'Kumpulkan sebutan serupa: (4a - 2a) + (3b + b) = 2a + 4b.',
   '{algebra,like-terms,simplify}'),
  (2,
   'Expand: 3(x + 4)',
   'Kembangkan: 3(x + 4)',
   '[{"key":"A","text":"3x + 4"},{"key":"B","text":"3x + 12"},{"key":"C","text":"3x + 7"},{"key":"D","text":"x + 12"}]',
   '[{"key":"A","text":"3x + 4"},{"key":"B","text":"3x + 12"},{"key":"C","text":"3x + 7"},{"key":"D","text":"x + 12"}]',
   'B',
   'Multiply each term inside the bracket by 3: 3 × x + 3 × 4 = 3x + 12.',
   'Darabkan setiap sebutan dalam kurungan dengan 3: 3 × x + 3 × 4 = 3x + 12.',
   '{algebra,expansion,distributive}'),
  (3,
   'Simplify: 2x² + 3x - x² + 5x - 2',
   'Permudahkan: 2x² + 3x - x² + 5x - 2',
   '[{"key":"A","text":"x² + 8x - 2"},{"key":"B","text":"3x² + 8x - 2"},{"key":"C","text":"x² + 2x - 2"},{"key":"D","text":"x² + 8x + 2"}]',
   '[{"key":"A","text":"x² + 8x - 2"},{"key":"B","text":"3x² + 8x - 2"},{"key":"C","text":"x² + 2x - 2"},{"key":"D","text":"x² + 8x + 2"}]',
   'A',
   'Group like terms: (2x² - x²) + (3x + 5x) + (-2) = x² + 8x - 2.',
   'Kumpulkan sebutan serupa: (2x² - x²) + (3x + 5x) + (-2) = x² + 8x - 2.',
   '{algebra,like-terms,simplify}')
) as v(diff, q_en, q_bm, opt_en, opt_bm, ans, exp_en, exp_bm, tags)
where t.chapter_number = 5 and t.form_level = 1 and s.code = 'MATH';

-- SAMPLE QUESTIONS - Form 1 Chapter 6 (Linear Equations)
insert into public.questions (topic_id, subject_id, form_level, difficulty, question_type, question_text_en, question_text_bm, options_en, options_bm, correct_answer, explanation_en, explanation_bm, tags)
select 
  t.id, s.id, 1, v.diff, 'mcq', v.q_en, v.q_bm, v.opt_en::jsonb, v.opt_bm::jsonb, v.ans, v.exp_en, v.exp_bm, v.tags::text[]
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  (1,
   'Solve: x + 5 = 12',
   'Selesaikan: x + 5 = 12',
   '[{"key":"A","text":"5"},{"key":"B","text":"7"},{"key":"C","text":"17"},{"key":"D","text":"12"}]',
   '[{"key":"A","text":"5"},{"key":"B","text":"7"},{"key":"C","text":"17"},{"key":"D","text":"12"}]',
   'B',
   'x + 5 = 12. Subtract 5 from both sides: x = 12 - 5 = 7.',
   'x + 5 = 12. Tolak 5 dari kedua-dua belah: x = 12 - 5 = 7.',
   '{linear-equations,solve}'),
  (1,
   'Solve: 3x = 15',
   'Selesaikan: 3x = 15',
   '[{"key":"A","text":"3"},{"key":"B","text":"5"},{"key":"C","text":"12"},{"key":"D","text":"45"}]',
   '[{"key":"A","text":"3"},{"key":"B","text":"5"},{"key":"C","text":"12"},{"key":"D","text":"45"}]',
   'B',
   'Divide both sides by 3: x = 15 ÷ 3 = 5.',
   'Bahagikan kedua-dua belah dengan 3: x = 15 ÷ 3 = 5.',
   '{linear-equations,solve}'),
  (2,
   'Solve: 2x + 3 = 11',
   'Selesaikan: 2x + 3 = 11',
   '[{"key":"A","text":"4"},{"key":"B","text":"7"},{"key":"C","text":"3"},{"key":"D","text":"5.5"}]',
   '[{"key":"A","text":"4"},{"key":"B","text":"7"},{"key":"C","text":"3"},{"key":"D","text":"5.5"}]',
   'A',
   'Step 1: 2x + 3 = 11. Subtract 3: 2x = 8. Step 2: Divide by 2: x = 4.',
   'Langkah 1: 2x + 3 = 11. Tolak 3: 2x = 8. Langkah 2: Bahagi dengan 2: x = 4.',
   '{linear-equations,two-step}'),
  (2,
   'Solve: 5x - 7 = 18',
   'Selesaikan: 5x - 7 = 18',
   '[{"key":"A","text":"5"},{"key":"B","text":"2.2"},{"key":"C","text":"25"},{"key":"D","text":"3"}]',
   '[{"key":"A","text":"5"},{"key":"B","text":"2.2"},{"key":"C","text":"25"},{"key":"D","text":"3"}]',
   'A',
   'Step 1: Add 7 to both sides: 5x = 25. Step 2: Divide by 5: x = 5.',
   'Langkah 1: Tambah 7 pada kedua-dua belah: 5x = 25. Langkah 2: Bahagi dengan 5: x = 5.',
   '{linear-equations,two-step}'),
  (3,
   'Solve: 3(x - 2) = 12',
   'Selesaikan: 3(x - 2) = 12',
   '[{"key":"A","text":"6"},{"key":"B","text":"4"},{"key":"C","text":"2"},{"key":"D","text":"8"}]',
   '[{"key":"A","text":"6"},{"key":"B","text":"4"},{"key":"C","text":"2"},{"key":"D","text":"8"}]',
   'A',
   'Step 1: Expand: 3x - 6 = 12. Step 2: Add 6: 3x = 18. Step 3: Divide by 3: x = 6.',
   'Langkah 1: Kembangkan: 3x - 6 = 12. Langkah 2: Tambah 6: 3x = 18. Langkah 3: Bahagi dengan 3: x = 6.',
   '{linear-equations,brackets,expansion}')
) as v(diff, q_en, q_bm, opt_en, opt_bm, ans, exp_en, exp_bm, tags)
where t.chapter_number = 6 and t.form_level = 1 and s.code = 'MATH';

-- ACHIEVEMENTS
insert into public.achievements (code, name_en, name_bm, description_en, description_bm, icon, xp_reward, criteria) values
  ('FIRST_LOGIN', 'Welcome!', 'Selamat Datang!', 'Complete your first login', 'Lengkapkan log masuk pertama anda', '👋', 50, '{"type":"login","value":1}'),
  ('FIRST_CHALLENGE', 'Challenger', 'Pencabar', 'Complete your first daily challenge', 'Lengkapkan cabaran harian pertama anda', '⚔️', 100, '{"type":"daily_complete","value":1}'),
  ('PERFECT_DAILY', 'Perfect!', 'Sempurna!', 'Score 5/5 on a daily challenge', 'Skor 5/5 dalam cabaran harian', '💯', 200, '{"type":"daily_perfect","value":1}'),
  ('STREAK_3', '3-Day Streak', 'Streak 3 Hari', 'Maintain a 3-day streak', 'Kekalkan streak 3 hari', '🔥', 150, '{"type":"streak","value":3}'),
  ('STREAK_7', 'Week Warrior', 'Pahlawan Minggu', 'Maintain a 7-day streak', 'Kekalkan streak 7 hari', '🔥', 300, '{"type":"streak","value":7}'),
  ('STREAK_30', 'Monthly Master', 'Tuan Bulanan', 'Maintain a 30-day streak', 'Kekalkan streak 30 hari', '🔥', 1000, '{"type":"streak","value":30}'),
  ('Q_100', 'Century', 'Centurion', 'Answer 100 questions', 'Jawab 100 soalan', '📝', 500, '{"type":"questions_answered","value":100}'),
  ('Q_500', 'Scholar', 'Cendekiawan', 'Answer 500 questions', 'Jawab 500 soalan', '📚', 1000, '{"type":"questions_answered","value":500}'),
  ('TOPIC_MASTER', 'Topic Master', 'Penguasa Topik', 'Score 90%+ on all questions in a topic', 'Skor 90%+ pada semua soalan dalam satu topik', '🎯', 300, '{"type":"topic_mastery","value":90}'),
  ('SPEED_DEMON', 'Speed Demon', 'Kilat', 'Complete daily challenge in under 60 seconds', 'Lengkapkan cabaran harian dalam masa kurang 60 saat', '⚡', 200, '{"type":"daily_speed","value":60}'),
  ('EXPLORER', 'Explorer', 'Peneroka', 'Practice questions from 5 different topics', 'Latih soalan dari 5 topik berbeza', '🗺️', 200, '{"type":"topics_explored","value":5}'),
  ('EARLY_BIRD', 'Early Bird', 'Rajin Pagi', 'Complete a challenge before 7am', 'Lengkapkan cabaran sebelum 7 pagi', '🌅', 150, '{"type":"early_challenge","value":7}'),
  ('NIGHT_OWL', 'Night Owl', 'Burung Hantu', 'Complete a challenge after 10pm', 'Lengkapkan cabaran selepas 10 malam', '🦉', 150, '{"type":"late_challenge","value":22}'),
  ('XP_1000', 'Rising Star', 'Bintang Baru', 'Earn 1,000 total XP', 'Kumpul 1,000 XP keseluruhan', '⭐', 0, '{"type":"xp_total","value":1000}'),
  ('XP_10000', 'Superstar', 'Superstar', 'Earn 10,000 total XP', 'Kumpul 10,000 XP keseluruhan', '🌟', 0, '{"type":"xp_total","value":10000}');
