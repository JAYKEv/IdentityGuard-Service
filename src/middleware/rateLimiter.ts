import { NextFunction, Request, Response } from "express";

import redisClient from "../redisDatabase";
import { logger, sendError } from "../helpers";

type WindowConfig = {
  windowSeconds: number;
  maxAttempts: number;
};

const inMemoryStore = new Map<
  string,
  {
    count: number;
    expiresAt: number;
  }
>();

const nowSeconds = () => Math.floor(Date.now() / 1000);

const withRedisOrMemoryIncrement = async (key: string, cfg: WindowConfig): Promise<number> => {
  if (redisClient.isReady) {
    const ttlSeconds = cfg.windowSeconds;
    const tx = redisClient.multi();
    tx.incr(key);
    tx.expire(key, ttlSeconds);
    const [countResult] = (await tx.exec()) ?? [];

    const count = typeof countResult === "number" ? countResult : Number(countResult);
    return Number.isNaN(count) ? 1 : count;
  }

  const current = inMemoryStore.get(key);
  const now = nowSeconds();

  if (!current || current.expiresAt <= now) {
    inMemoryStore.set(key, { count: 1, expiresAt: now + cfg.windowSeconds });
    return 1;
  }

  current.count += 1;
  inMemoryStore.set(key, current);
  return current.count;
};

const isLockoutActive = async (key: string): Promise<boolean> => {
  if (redisClient.isReady) {
    const val = await redisClient.get(key);
    return !!val;
  }

  const item = inMemoryStore.get(key);
  return !!item && item.expiresAt > nowSeconds();
};

const activateLockout = async (key: string, seconds: number) => {
  if (redisClient.isReady) {
    await redisClient.set(key, "1", { EX: seconds });
    return;
  }

  inMemoryStore.set(key, { count: Number.MAX_SAFE_INTEGER, expiresAt: nowSeconds() + seconds });
};

const softLockoutResponse = (res: Response) =>
  sendError(
    res,
    {
      status: 429,
      message: "Too many failed login attempts. Please try again in a few minutes.",
    } as any,
  );

const buildLoginKey = (req: Request) => {
  const email = (req.body.email ?? "").toString().toLowerCase();
  const ip = req.ip;

  return { keyBase: `${ip}:${email}`, email, ip };
};

export const loginSoftLockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { keyBase, email } = buildLoginKey(req);

  if (!email) {
    return next();
  }

  const lockKey = `lockout:login:${keyBase}`;

  if (await isLockoutActive(lockKey)) {
    logger.warn(`Soft lockout in effect for ${keyBase}`);
    return softLockoutResponse(res);
  }

  return next();
};

export const loginFailureTracker = async (req: Request) => {
  const { keyBase, email } = buildLoginKey(req);

  if (!email) {
    return;
  }

  const attemptsKey = `attempts:login:${keyBase}`;
  const lockKey = `lockout:login:${keyBase}`;

  const count = await withRedisOrMemoryIncrement(attemptsKey, {
    windowSeconds: 15 * 60,
    maxAttempts: 5,
  });

  if (count > 5) {
    await activateLockout(lockKey, 5 * 60);
    logger.warn(`Soft lockout activated for ${keyBase}`);
  }
};

export const refreshRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const key = `rate:refresh:${ip}`;

  const count = await withRedisOrMemoryIncrement(key, {
    windowSeconds: 60,
    maxAttempts: 20,
  });

  if (count > 20) {
    logger.warn(`Refresh endpoint rate limit exceeded for ip=${ip}`);
    return sendError(
      res,
      {
        status: 429,
        message: "Too many refresh attempts. Please slow down your requests.",
      } as any,
    );
  }

  return next();
};


