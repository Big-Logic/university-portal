const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const studentsController = require('../controllers/students.controller');
const { createStudentSchema, updateStudentSchema } = require('../validators/students.validators');

const router = express.Router();

// Self-service: any authenticated student can view their own profile.
// Placed before /:id so "me" is never parsed as a numeric id.
router.get('/me', authenticate, studentsController.getMe);

// Arbitrary lookup/listing is staff-only (registrar/admin/faculty) --
// a student's program, status, and student_id aren't something other
// students should be able to browse.
router.get(
  '/',
  authenticate,
  requireRole('registrar', 'admin', 'faculty'),
  studentsController.list
);
router.get(
  '/:id',
  authenticate,
  requireRole('registrar', 'admin', 'faculty'),
  studentsController.getOne
);

router.post(
  '/',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(createStudentSchema),
  studentsController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(updateStudentSchema),
  studentsController.update
);

// router.delete('/:id', authenticate, requireRole('registrar', 'admin'), studentsController.remove);

module.exports = router;
