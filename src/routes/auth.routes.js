const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { loginSchema, refreshSchema, logoutSchema } = require('../validators/auth.validators');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);

module.exports = router;
