import { NextFunction, Request, Response } from "express";
import passport from "passport";
import createHttpError from "http-errors";

import { userTokenService } from "../../services/userTokenService";
import {
  generateTokens,
  logger,
  convertTimeStrToMillisec,
  sendResponse,
  sendError,
} from "../../helpers";
import { asyncWrapper } from "../utils/asyncWrapper";
import { User } from "../../types";
import { config } from "../../config";
import { messages } from "../../constants";
import { auditLogService } from "../../services/auditLogService";
import { loginFailureTracker } from "../../middleware/rateLimiter";

function promisifiedPassportLocalAuthentication(req: Request, res: Response, next: NextFunction) {
  return new Promise<{ user: User; accessToken: string; refreshToken: string; jti: string }>(
    (resolve, reject) => {
      passport.authenticate(
        "local",
        { session: false },
        (err: Error, user: User, info: { message: string }) => {
          if (err) {
            return reject(createHttpError(500, err));
          }

          if (!user) {
            const { message } = info;
            return reject(createHttpError(401, message));
          }

          const { accessToken, refreshToken, jti } = generateTokens(user.id, user.role);

          return resolve({ user, accessToken, refreshToken, jti });
        },
      )(req, res, next);
    },
  );
}

const loginController = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      user,
      accessToken,
      refreshToken: newRefreshToken,
      jti,
    } = await promisifiedPassportLocalAuthentication(req, res, next);

    const { refreshToken: existingRefreshToken } = req.cookies;

    // in case exists a refresh token cookie...
    if (existingRefreshToken) {
      const userToken = await userTokenService.findUserTokenByToken(existingRefreshToken);

      // if it doesn't exists in the database, it means that someone else rotated it!
      //  So, let's clear all valid refresh tokens
      if (!userToken) {
        logger.warn(
          `The refresh token sent from ${user.id} could be used in another device. All devices were signed out`,
        );

        // remove all valid user tokens for that user id
        await userTokenService.removeAllUserTokensById(user.id);
      } else {
        // in case the cookie is available in the session and it's in the database
        // we need rotate it
        await userTokenService.removeUserTokenById(user.id);
      }

      // invalidate refresh token cookie
      res.clearCookie(config.refreshTokenName);
    }

    // register the new refreshToken as a session
    const ip = req.ip;
    const userAgent = req.get("user-agent") ?? undefined;

    await userTokenService.create(user.id, newRefreshToken, {
      jti,
      ip,
      userAgent,
    });

    if (config.authMode === "cookie") {
      res.cookie(config.refreshTokenName, newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        domain: config.cookieDomain,
        maxAge: convertTimeStrToMillisec(config.refreshTokenExpiration),
      });
    }

    auditLogService.logAuthEvent(
      "login_success",
      {
        userId: user.id,
        ip,
        userAgent,
      },
      req,
    );

    const responseBody =
      config.authMode === "header"
        ? { token: accessToken, refreshToken: newRefreshToken }
        : { token: accessToken };

    return sendResponse(res, responseBody, 201);
  } catch (err) {
    const error = err as Error;

    logger.error(error.message);

    // track failed attempts for soft lockout
    await loginFailureTracker(req);

    auditLogService.logAuthEvent(
      "login_failure",
      {
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        details: { email: req.body.email },
      },
      req,
    );

    // replace the default error response
    if (error.message === messages.INVALID_TOKEN || error.message === messages.NO_AUTH_TOKEN) {
      return sendError(res, createHttpError(401, error));
    }

    return sendError(res, error);
  }
});

export default loginController;
