export interface UserToken {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  lastUsedAt?: Date;
  ip?: string;
  userAgent?: string;
}
