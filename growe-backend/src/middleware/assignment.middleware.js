import * as assignmentModel from '../models/assignment.model.js';

export const requireAssignmentOwner = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID required' });
    }

    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only access your own assignments' });
    }

    req.assignment = assignment;
    next();
  } catch (err) {
    next(err);
  }
};
