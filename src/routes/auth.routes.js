const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const {
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
} = require("../validators/auth.validators");

const router = express.Router();

router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", validate(logoutSchema), authController.logout);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

module.exports = router;
