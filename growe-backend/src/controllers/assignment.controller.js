import * as assignmentService from '../services/assignment.service.js';

export const create = async (req, res, next) => {
  try {
    const row = await assignmentService.createAssignment(req.user.id, req.body, {
      roleName: req.user.roleName,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await assignmentService.listAssignments(req.user.id, req.validatedQuery);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.json(assignmentService.getEnrichedById(req.assignment));
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const row = await assignmentService.updateAssignment(req.user.id, req.params.id, req.body, {
      roleName: req.user.roleName,
    });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await assignmentService.softDeleteAssignment(req.user.id, req.params.id, {
      roleName: req.user.roleName,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
