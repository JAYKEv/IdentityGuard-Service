import { Router } from "express";

import { validators } from "../middleware/validators";
import { authVerifier } from "../middleware/authVerifier";
import { authController } from "../controllers";
import { loginSoftLockMiddleware, refreshRateLimiter } from "../middleware/rateLimiter";
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from "../controllers/authController/sessionController";

const router = Router();

router.post(
  "/login",
  loginSoftLockMiddleware,
  validators.loginValidationRules,
  validators.validate,
  authController.login,
);

router.post(
  "/register",
  validators.registerValidationRules,
  validators.validate,
  authController.register,
);

router.post("/refresh", refreshRateLimiter, authVerifier.verifyRefreshToken, authController.refreshToken);

router.post("/logout", authVerifier.verifyAccessToken, authController.logout);

router.get("/sessions", authVerifier.verifyAccessToken, listSessions);
router.delete("/sessions/:sessionId", authVerifier.verifyAccessToken, revokeSession);
router.delete("/sessions", authVerifier.verifyAccessToken, revokeOtherSessions);

router.get("/profile", authVerifier.verifyAccessToken, authController.getProfile);

router.patch(
  "/profile",
  authVerifier.verifyAccessToken,
  validators.updateProfileValidationRules,
  validators.validate,
  authController.updateProfile,
);

export default router;
