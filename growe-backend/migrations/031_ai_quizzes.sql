CREATE TABLE group_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  document_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES group_quizzes(id) ON DELETE CASCADE,
  question VARCHAR(1000) NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  explanation VARCHAR(2000)
);

CREATE TABLE group_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES group_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, user_id)
);

CREATE INDEX idx_group_quizzes_group_id ON group_quizzes(group_id);
CREATE INDEX idx_group_quiz_questions_quiz_id ON group_quiz_questions(quiz_id);
CREATE INDEX idx_group_quiz_attempts_quiz_id ON group_quiz_attempts(quiz_id);
CREATE INDEX idx_group_quiz_attempts_user_id ON group_quiz_attempts(user_id);
