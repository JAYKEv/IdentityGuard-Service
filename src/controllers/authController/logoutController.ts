import { Request, Response } from "express";
import { ExtractJwt } from "passport-jwt";
import createHttpError from "http-errors";

import { config } from "../../config";
import { messages } from "../../constants";
import { asyncWrapper } from "../utils/asyncWrapper";
import { convertTimeStrToMillisec, logger, sendError, sendResponse } from "../../helpers";
import { tokenBlockListService } from "../../services/tokenBlockListService";
import { userTokenService } from "../../services/userTokenService";
import { auditLogService } from "../../services/auditLogService";

const logoutController = asyncWrapper(async (req: Request, res: Response) => {
  try {
    const { tokenExp, userId } = req;

    const refreshToken = req.cookies[config.refreshTokenName];
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (config.authMode === "cookie" && refreshToken) {
      await userTokenService.removeUserTokenByToken(refreshToken);
    } else if (userId) {
      await userTokenService.removeAllUserTokensById(userId);
    }

    if (accessToken) {
      await tokenBlockListService.addTokenToBlocklist(
        accessToken,
        tokenExp ?? convertTimeStrToMillisec(config.accessTokenExpiration),
      );
    }

    // invalidate refresh token cookie
    if (config.authMode === "cookie") {
      res.clearCookie(config.refreshTokenName);
    }

    auditLogService.logAuthEvent(
      "token_revoked",
      {
        userId,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
      },
      req,
    );

    res.setHeader("Location", "/");
    return sendResponse(res, messages.SUCCESS_LOGOUT, 303);
  } catch (err) {
    const error = err as Error;

    logger.error(error.message);
    return sendError(res, createHttpError(403, error));
  }
});

export default logoutController;
