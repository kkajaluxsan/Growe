import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  assignmentListQuerySchema,
} from './assignment.schema.js';

describe('assignmentCreateSchema', () => {
  it('rejects missing title', () => {
    const { error } = assignmentCreateSchema.validate({
      description: 'd',
      deadline: new Date(Date.now() + 86400000),
    });
    assert.ok(error);
  });

  it('rejects missing description', () => {
    const { error } = assignmentCreateSchema.validate({
      title: 't',
      deadline: new Date(Date.now() + 86400000),
    });
    assert.ok(error);
  });

  it('rejects deadline in the past', () => {
    const { error } = assignmentCreateSchema.validate({
      title: 't',
      description: 'd',
      deadline: new Date(Date.now() - 86400000),
    });
    assert.ok(error);
  });

  it('accepts valid payload with priority and status', () => {
    const { error, value } = assignmentCreateSchema.validate({
      title: ' Essay ',
      description: 'Write intro',
      deadline: new Date(Date.now() + 3600000),
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });
    assert.equal(error, undefined);
    assert.equal(value.priority, 'HIGH');
    assert.equal(value.status, 'IN_PROGRESS');
  });
});

describe('assignmentUpdateSchema', () => {
  it('rejects empty body', () => {
    const { error } = assignmentUpdateSchema.validate({});
    assert.ok(error);
  });

  it('accepts partial update', () => {
    const { error, value } = assignmentUpdateSchema.validate({ title: 'New' });
    assert.equal(error, undefined);
    assert.equal(value.title, 'New');
  });
});

describe('assignmentListQuerySchema', () => {
  it('applies defaults and coerces limit', () => {
    const { error, value } = assignmentListQuerySchema.validate({ limit: '10', offset: '0' });
    assert.equal(error, undefined);
    assert.equal(value.limit, 10);
    assert.equal(value.offset, 0);
  });
});
