import { Request, Response } from "express";
import createHttpError from "http-errors";

import { asyncWrapper } from "../utils/asyncWrapper";
import { sendError, sendResponse, logger } from "../../helpers";
import { userTokenService } from "../../services/userTokenService";
import { auditLogService } from "../../services/auditLogService";

export const listSessions = asyncWrapper(async (req: Request, res: Response) => {
  const { userId } = req;

  if (!userId) {
    return sendError(res, createHttpError(403, "User not found in request context"));
  }

  try {
    const tokens = await userTokenService.findAllUserTokensByUserId(userId);

    const sessions = tokens.map(t => ({
      sessionId: t.id,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt ?? t.createdAt,
      ip: t.ip,
      userAgent: t.userAgent,
    }));

    return sendResponse(res, sessions, 200);
  } catch (err) {
    const error = err as Error;
    logger.error(error.message);
    return sendError(res, createHttpError(500, error));
  }
});

export const revokeSession = asyncWrapper(async (req: Request, res: Response) => {
  const { userId } = req;
  const { sessionId } = req.params;

  if (!userId) {
    return sendError(res, createHttpError(403, "User not found in request context"));
  }

  try {
    const tokens = await userTokenService.findAllUserTokensByUserId(userId);
    const session = tokens.find(t => t.id === sessionId);

    if (!session) {
      return sendError(res, createHttpError(404, "Session not found"));
    }

    await userTokenService.removeUserTokenByToken(session.token);

    auditLogService.logAuthEvent(
      "token_revoked",
      {
        userId,
        sessionId,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
      },
      req,
    );

    return sendResponse(res, { revokedSessionId: sessionId }, 200);
  } catch (err) {
    const error = err as Error;
    logger.error(error.message);
    return sendError(res, createHttpError(500, error));
  }
});

export const revokeOtherSessions = asyncWrapper(async (req: Request, res: Response) => {
  const { userId } = req;

  if (!userId) {
    return sendError(res, createHttpError(403, "User not found in request context"));
  }

  try {
    const tokens = await userTokenService.findAllUserTokensByUserId(userId);

    if (!tokens.length) {
      return sendResponse(res, { revokedSessionIds: [] }, 200);
    }

    const currentSession = tokens.reduce((latest, token) => {
      const latestTime = latest.lastUsedAt ?? latest.createdAt;
      const tokenTime = token.lastUsedAt ?? token.createdAt;

      return tokenTime > latestTime ? token : latest;
    }, tokens[0]);

    const otherSessions = tokens.filter(t => t.id !== currentSession.id);

    await Promise.all(otherSessions.map(s => userTokenService.removeUserTokenByToken(s.token)));

    auditLogService.logAuthEvent(
      "token_revoked",
      {
        userId,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        details: { revokedSessions: otherSessions.map(s => s.id) },
      },
      req,
    );

    return sendResponse(
      res,
      { revokedSessionIds: otherSessions.map(s => s.id) },
      200,
    );
  } catch (err) {
    const error = err as Error;
    logger.error(error.message);
    return sendError(res, createHttpError(500, error));
  }
});


