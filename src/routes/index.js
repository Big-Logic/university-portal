const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const programRoutes = require('./programs.routes');
const courseRoutes = require('./courses.routes');
const courseOfferingRoutes = require('./courseOfferings.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/programs', programRoutes);
router.use('/courses', courseRoutes);
router.use('/course-offerings', courseOfferingRoutes);

module.exports = router;
