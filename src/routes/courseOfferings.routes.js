const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const courseOfferingsController = require('../controllers/courseOfferings.controller');
const {
  createCourseOfferingSchema,
  updateCourseOfferingSchema,
  addMeetingTimeSchema,
} = require('../validators/courseOfferings.validators');

const router = express.Router();

// GET /?course_id=&term_id=&instructor_id= -- all optional filters.
// Open to any authenticated role: students need to browse offerings
// to enroll (a later epic), faculty use instructor_id to see their
// own teaching schedule.
router.get('/', authenticate, courseOfferingsController.list);
router.get('/:id', authenticate, courseOfferingsController.getOne);
router.get('/:id/meeting-times', authenticate, courseOfferingsController.listMeetingTimes);

router.post(
  '/',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(createCourseOfferingSchema),
  courseOfferingsController.create
);

router.patch(
  '/:id',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(updateCourseOfferingSchema),
  courseOfferingsController.update
);

router.post(
  '/:id/meeting-times',
  authenticate,
  requireRole('registrar', 'admin'),
  validate(addMeetingTimeSchema),
  courseOfferingsController.addMeetingTime
);

module.exports = router;
