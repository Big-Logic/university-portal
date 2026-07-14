const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./users.routes');
const programRoutes = require('./programs.routes');
const courseRoutes = require('./courses.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/programs', programRoutes);
router.use('/courses', courseRoutes);

module.exports = router;
