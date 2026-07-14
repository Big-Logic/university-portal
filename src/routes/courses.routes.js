const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const coursesController = require('../controllers/courses.controller');
const { createCourseSchema, updateCourseSchema } = require('../validators/courses.validators');

const router = express.Router();

// GET /?program_id=3 filters to one program's courses; omit for all.
router.get('/', authenticate, coursesController.list);
router.get('/:id', authenticate, coursesController.getOne);

router.post(
  '/',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(createCourseSchema),
  coursesController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(updateCourseSchema),
  coursesController.update
);

module.exports = router;
