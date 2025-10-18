-- Script para popular todos os exercícios no banco de dados
-- Exclui: Squat, Plank, Push-up (já cadastrados)
-- Total: 20 exercícios novos

INSERT INTO "public"."exercises" ("type", "name_en", "name_pt", "description_en", "description_pt", "category", "difficulty", "ml_model_path", "is_active") VALUES

-- Pernas (Lower Body)
('legPress', 'Leg Press', 'Leg Press', 'Leg press machine exercise for quadriceps and glutes', 'Exercício de leg press para quadríceps e glúteos', 'lower_body', 2, NULL, TRUE),
('lunges', 'Lunges', 'Afundo', 'Forward or reverse lunges for legs and glutes', 'Afundo frontal ou reverso para pernas e glúteos', 'lower_body', 2, NULL, TRUE),
('calfRaise', 'Calf Raise', 'Elevação de Panturrilha', 'Standing or seated calf raises', 'Elevação de panturrilha em pé ou sentado', 'lower_body', 1, NULL, TRUE),
('hamstringCurl', 'Hamstring Curl', 'Flexão de Pernas', 'Lying or seated hamstring curl exercise', 'Flexão de pernas deitado ou sentado', 'lower_body', 2, NULL, TRUE),
('glutes', 'Glute Bridge', 'Elevação de Quadril', 'Hip thrust or glute bridge exercise', 'Exercício de elevação de quadril', 'lower_body', 2, NULL, TRUE),
('deadlift', 'Deadlift', 'Levantamento Terra', 'Compound exercise for posterior chain', 'Exercício composto para cadeia posterior', 'lower_body', 3, NULL, TRUE),

-- Peito (Upper Body - Chest)
('benchPress', 'Bench Press', 'Supino', 'Barbell or dumbbell bench press', 'Supino com barra ou halteres', 'upper_body', 2, NULL, TRUE),
('chestFly', 'Chest Fly', 'Crucifixo', 'Dumbbell or cable chest fly exercise', 'Crucifixo com halteres ou cabos', 'upper_body', 2, NULL, TRUE),
('dip', 'Dip', 'Mergulho', 'Parallel bar dips for chest and triceps', 'Mergulho em barras paralelas', 'upper_body', 3, NULL, TRUE),

-- Costas (Upper Body - Back)
('pullUp', 'Pull-up', 'Barra Fixa', 'Pull-up or chin-up exercise', 'Exercício de barra fixa', 'upper_body', 3, NULL, TRUE),
('latPulldown', 'Lat Pulldown', 'Puxada', 'Cable lat pulldown exercise', 'Exercício de puxada no cabo', 'upper_body', 2, NULL, TRUE),
('cableRow', 'Cable Row', 'Remada no Cabo', 'Seated cable row for back', 'Remada sentado no cabo', 'upper_body', 2, NULL, TRUE),

-- Ombros (Upper Body - Shoulders)
('shoulderPress', 'Shoulder Press', 'Desenvolvimento', 'Overhead press with barbell or dumbbells', 'Desenvolvimento com barra ou halteres', 'upper_body', 2, NULL, TRUE),
('lateralRaise', 'Lateral Raise', 'Elevação Lateral', 'Dumbbell lateral raises for shoulders', 'Elevação lateral com halteres', 'upper_body', 1, NULL, TRUE),
('frontRaise', 'Front Raise', 'Elevação Frontal', 'Dumbbell front raises for shoulders', 'Elevação frontal com halteres', 'upper_body', 1, NULL, TRUE),
('arnoldPress', 'Arnold Press', 'Arnold Press', 'Rotating dumbbell shoulder press', 'Desenvolvimento com rotação de halteres', 'upper_body', 2, NULL, TRUE),
('shrugs', 'Shrugs', 'Encolhimento', 'Barbell or dumbbell shoulder shrugs', 'Encolhimento de ombros com barra ou halteres', 'upper_body', 1, NULL, TRUE),

-- Braços (Upper Body - Arms)
('biceps', 'Bicep Curl', 'Rosca Bíceps', 'Barbell or dumbbell bicep curls', 'Rosca bíceps com barra ou halteres', 'upper_body', 1, NULL, TRUE),
('triceps', 'Tricep Extension', 'Tríceps', 'Overhead or cable tricep extensions', 'Extensão de tríceps acima da cabeça ou no cabo', 'upper_body', 1, NULL, TRUE),

-- Core
('abdominal', 'Crunches', 'Abdominal', 'Basic abdominal crunches exercise', 'Exercício básico de abdominal', 'core', 1, NULL, TRUE),
('crossOver', 'Cross-Over', 'Cross-Over', 'Cable cross-over exercise for chest', 'Cross-over no cabo para peito', 'upper_body', 2, NULL, TRUE)

ON CONFLICT (type) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_pt = EXCLUDED.name_pt,
  description_en = EXCLUDED.description_en,
  description_pt = EXCLUDED.description_pt,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  updated_at = NOW();
