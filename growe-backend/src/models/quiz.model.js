import { query } from '../config/db.js';

export const createQuiz = async ({ groupId, createdBy, title, documentName }) => {
  const { rows } = await query(
    `INSERT INTO group_quizzes (group_id, created_by, title, document_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, group_id, created_by, title, document_name, created_at`,
    [groupId, createdBy, title, documentName]
  );
  return rows[0];
};

export const createQuestions = async (quizId, questions) => {
  if (!questions || questions.length === 0) return [];

  const values = [];
  const params = [];
  let i = 1;

  questions.forEach(q => {
    values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    params.push(quizId, q.question, JSON.stringify(q.options), q.correct_index, q.explanation || null);
  });

  const { rows } = await query(
    `INSERT INTO group_quiz_questions (quiz_id, question, options, correct_index, explanation)
     VALUES ${values.join(', ')}
     RETURNING id, quiz_id, question, options, correct_index, explanation`,
    params
  );
  return rows;
};

export const getQuizzesByGroup = async (groupId, userId) => {
  const { rows } = await query(
    `SELECT q.id, q.group_id, q.title, q.document_name, q.created_at,
            u.display_name as creator_name,
            (SELECT COUNT(*) FROM group_quiz_questions gqq WHERE gqq.quiz_id = q.id) as question_count,
            qa.score, qa.total, qa.created_at as attempt_date
     FROM group_quizzes q
     JOIN users u ON q.created_by = u.id
     LEFT JOIN group_quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $2
     WHERE q.group_id = $1
     ORDER BY q.created_at DESC`,
    [groupId, userId]
  );
  return rows;
};

export const getQuizById = async (quizId) => {
  const { rows } = await query(
    `SELECT q.id, q.group_id, q.title, q.document_name, q.created_at, q.created_by
     FROM group_quizzes q
     WHERE q.id = $1`,
    [quizId]
  );
  return rows[0] || null;
};

export const getQuestionsByQuiz = async (quizId) => {
  const { rows } = await query(
    `SELECT id, quiz_id, question, options, correct_index, explanation
     FROM group_quiz_questions
     WHERE quiz_id = $1
     ORDER BY id ASC`,
    [quizId]
  );
  return rows;
};

export const createAttempt = async ({ quizId, userId, score, total, answers }) => {
  const { rows } = await query(
    `INSERT INTO group_quiz_attempts (quiz_id, user_id, score, total, answers)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (quiz_id, user_id) DO UPDATE SET score = EXCLUDED.score, total = EXCLUDED.total, answers = EXCLUDED.answers, created_at = NOW()
     RETURNING id, quiz_id, user_id, score, total, answers, created_at`,
    [quizId, userId, score, total, JSON.stringify(answers || [])]
  );
  return rows[0];
};

export const getAttempt = async (quizId, userId) => {
  const { rows } = await query(
    `SELECT id, quiz_id, user_id, score, total, answers, created_at
     FROM group_quiz_attempts
     WHERE quiz_id = $1 AND user_id = $2`,
    [quizId, userId]
  );
  return rows[0] || null;
};

export const getAttemptsByQuiz = async (quizId) => {
  const { rows } = await query(
    `SELECT qa.id, qa.quiz_id, qa.user_id, qa.score, qa.total, qa.answers, qa.created_at,
            u.display_name, u.email
     FROM group_quiz_attempts qa
     JOIN users u ON qa.user_id = u.id
     WHERE qa.quiz_id = $1
     ORDER BY qa.created_at DESC`,
    [quizId]
  );
  return rows;
};
