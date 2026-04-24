import { generateReply } from '../services/ai.service.js';
import * as quizModel from '../models/quiz.model.js';
import * as groupModel from '../models/group.model.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const generateQuiz = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const title = req.body.title || 'AI Generated Quiz';
    const count = parseInt(req.body.count, 10) || 5;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Document is required' });
    }

    // Verify user is tutor in the group
    const isMember = await groupModel.isMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Note: Assuming any member (or we enforce tutor only if req.user.role === 'tutor' or if we check group_members.role)
    // Let's just check if they are tutor role globally
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Only tutors can generate quizzes' });
    }

    let documentContext = '';
    if (file.mimetype === 'application/pdf') {
      try {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: file.buffer });
        await parser.load();
        const result = await parser.getText();
        documentContext = (result && result.text ? result.text : '').slice(0, 15000);
      } catch (pdfErr) {
        return res.status(400).json({ error: 'Could not read the PDF. Please try a different file.' });
      }
    } else {
      documentContext = file.buffer.toString('utf8').slice(0, 15000);
    }

    const prompt = `Generate exactly ${count} multiple choice quiz questions based on the following document context: "[Document Start] ${documentContext} [Document End]".
Respond ONLY with a valid JSON array of objects.
Each object must have:
- "question": The question text
- "options": An array of exactly 4 string options
- "correct_index": The integer index (0-3) of the correct option in the array
- "explanation": A brief string explaining why the answer is correct

Example format:
[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correct_index": 1,
    "explanation": "Because 2 plus 2 equals 4."
  }
]

Do not include any introductory text, markdown formatting, or explanations. Just the JSON array.`;

    const reply = await generateReply(prompt);
    
    let questions = [];
    try {
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : reply.replace(/```json/gi, '').replace(/```/g, '').trim();
      questions = JSON.parse(cleanedJson);
      if (!Array.isArray(questions)) throw new Error('Not an array');
      
      // Basic validation
      questions = questions.filter(q => q.question && Array.isArray(q.options) && q.options.length > 0 && typeof q.correct_index === 'number');
      if (questions.length === 0) throw new Error('No valid questions parsed');
    } catch (e) {
      return res.status(500).json({ error: 'AI failed to return valid quiz questions. Try a different document.' });
    }

    const quiz = await quizModel.createQuiz({
      groupId,
      createdBy: req.user.id,
      title,
      documentName: file.originalname
    });

    const savedQuestions = await quizModel.createQuestions(quiz.id, questions);

    res.json({ quiz, questions: savedQuestions });
  } catch (err) {
    next(err);
  }
};

export const listQuizzes = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    const isMember = await groupModel.isMember(groupId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const quizzes = await quizModel.getQuizzesByGroup(groupId, req.user.id);
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
};

export const getQuiz = async (req, res, next) => {
  try {
    const { groupId, quizId } = req.params;
    const isMember = await groupModel.isMember(groupId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const quiz = await quizModel.getQuizById(quizId);
    if (!quiz || quiz.group_id !== groupId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await quizModel.getQuestionsByQuiz(quizId);
    const attempt = await quizModel.getAttempt(quizId, req.user.id);

    // If the user hasn't attempted it and is a student, strip correct answers
    let returnQuestions = questions;
    if (req.user.role === 'student' && !attempt) {
      returnQuestions = questions.map(q => {
        const { correct_index, explanation, ...rest } = q;
        return rest;
      });
    }

    res.json({ quiz, questions: returnQuestions, attempt });
  } catch (err) {
    next(err);
  }
};

export const submitQuiz = async (req, res, next) => {
  try {
    const { groupId, quizId } = req.params;
    const { answers } = req.body; // array of { questionId, selectedIndex }

    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit quizzes' });
    }

    const isMember = await groupModel.isMember(groupId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied' });

    const quiz = await quizModel.getQuizById(quizId);
    if (!quiz || quiz.group_id !== groupId) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const existingAttempt = await quizModel.getAttempt(quizId, req.user.id);
    if (existingAttempt) {
      return res.status(400).json({ error: 'You have already attempted this quiz' });
    }

    const questions = await quizModel.getQuestionsByQuiz(quizId);
    
    let score = 0;
    const total = questions.length;
    
    // Evaluate
    questions.forEach(q => {
      const studentAnswer = answers.find(a => a.questionId === q.id);
      if (studentAnswer && studentAnswer.selectedIndex === q.correct_index) {
        score++;
      }
    });

    const attempt = await quizModel.createAttempt({
      quizId,
      userId: req.user.id,
      score,
      total
    });

    res.json({ attempt, questions }); // return full questions with answers and explanations
  } catch (err) {
    next(err);
  }
};
