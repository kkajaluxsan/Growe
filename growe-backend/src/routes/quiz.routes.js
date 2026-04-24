import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireGroupMember } from '../middleware/group.middleware.js';
import * as quizController from '../controllers/quiz.controller.js';

const router = express.Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requireGroupMember);

router.post('/generate', upload.single('document'), quizController.generateQuiz);
router.get('/', quizController.listQuizzes);
router.get('/:quizId', quizController.getQuiz);
router.post('/:quizId/submit', quizController.submitQuiz);

export default router;
