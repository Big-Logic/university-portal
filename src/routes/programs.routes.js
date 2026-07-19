const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const programsController = require('../controllers/programs.controller');
const { createProgramSchema, updateProgramSchema } = require('../validators/programs.validators');

const router = express.Router();

// Reading the catalog is fine for any authenticated role (student,
// faculty, etc.) -- only mutating it is registrar/admin-restricted.
router.get('/', authenticate, programsController.list);
router.get('/:id', authenticate, programsController.getOne);

router.post(
  '/',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(createProgramSchema),
  programsController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(updateProgramSchema),
  programsController.update
);

module.exports = router;
