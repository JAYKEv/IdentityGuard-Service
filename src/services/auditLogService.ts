import { Request } from "express";

import { logger } from "../helpers";

export type AuditAction =
  | "login_success"
  | "login_failure"
  | "refresh_token_reuse_detected"
  | "token_revoked"
  | "role_updated";

export interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  details?: Record<string, unknown>;
}

const getRequestMetadata = (req: Request | undefined): AuditContext => {
  if (!req) {
    return {};
  }

  return {
    ip: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  };
};

export const auditLogService = {
  logAuthEvent: (action: AuditAction, ctx: AuditContext = {}, req?: Request) => {
    const base = getRequestMetadata(req);

    const payload = {
      action,
      userId: ctx.userId,
      ip: ctx.ip ?? base.ip,
      userAgent: ctx.userAgent ?? base.userAgent,
      sessionId: ctx.sessionId,
      timestamp: new Date().toISOString(),
      ...ctx.details,
    };

    logger.info(`[audit] ${JSON.stringify(payload)}`);
  },
};


