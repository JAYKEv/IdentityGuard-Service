import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

import { UserRoles } from "../types";
import { config } from "../config";

export const generateTokens = (id: string, role: UserRoles) => {
  const payload = { id, role };
  const jti = randomUUID();

  const accessToken = jwt.sign(payload, config.accessTokenPrivateKey, {
    expiresIn: config.accessTokenExpiration,
    jwtid: jti,
  });

  const refreshToken = jwt.sign(payload, config.refreshTokenPrivateKey, {
    expiresIn: config.refreshTokenExpiration,
    jwtid: jti,
  });

  return { accessToken, refreshToken, jti };
};
