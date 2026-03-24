import * as assignmentModel from '../models/assignment.model.js';

export const create = async (req, res, next) => {
  try {
    const { title, description, status = 'pending', priority = 2, deadline } = req.body;
    const assignment = await assignmentModel.create({
      userId: req.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      status,
      priority: priority || 2,
      deadline: deadline ? new Date(deadline) : null,
    });
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const { status, sortBy, sortOrder, limit, offset } = req.query;
    const assignments = await assignmentModel.listByUser(req.user.id, {
      status,
      sortBy: sortBy || 'deadline',
      sortOrder: sortOrder || 'asc',
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.json(req.assignment);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { title, description, status, priority, deadline } = req.body;
    const assignment = await assignmentModel.update(req.params.id, {
      title: title?.trim(),
      description: description !== undefined ? description?.trim() : undefined,
      status,
      priority,
      deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
    });
    res.json(assignment);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await assignmentModel.deleteById(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
