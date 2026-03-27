import * as assignmentModel from '../models/assignment.model.js';
import * as notificationService from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

/**
 * Assignments due within the next 24 hours — one reminder per assignment (deadline_reminder_sent_at).
 */
export const runAssignmentDeadlineReminderJob = async () => {
  const now = new Date();
  const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const rows = await assignmentModel.listDueForDeadlineReminder(now.toISOString(), in24.toISOString());
  let ok = 0;
  for (const a of rows) {
    try {
      await notificationService.notifyAssignmentDeadlineReminder({
        userId: a.user_id,
        assignment: { id: a.id, title: a.title, deadline: a.deadline },
        email: a.email,
      });
      await assignmentModel.markDeadlineReminderSent(a.id);
      ok += 1;
    } catch (err) {
      logger.warn('assignment_deadline_reminder_failed', { assignmentId: a.id, err: err.message });
    }
  }
  return { due: rows.length, sent: ok };
};
