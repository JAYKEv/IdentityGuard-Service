import { Document, Types } from "mongoose";

import userTokenModel, { UserTokenModel } from "../database/model/userTokenModel";
import { UserToken } from "../types";

type UserTokenDoc = Document<unknown, NonNullable<unknown>, UserTokenModel> &
  Omit<
    UserTokenModel & {
      _id: Types.ObjectId;
    },
    never
  >;

const convertUserDocToUserToken = (userTokenDoc: UserTokenDoc) => {
  const userToken: UserToken = {
    id: userTokenDoc._id.toString(),
    userId: userTokenDoc.userId.toString(),
    token: userTokenDoc.token,
    createdAt: userTokenDoc.createdAt,
    lastUsedAt: userTokenDoc.lastUsedAt,
    ip: userTokenDoc.ip,
    userAgent: userTokenDoc.userAgent,
  };

  return userToken;
};

export const userTokenService = {
  create: async (
    userId: string,
    token: string,
    metadata?: { jti?: string; ip?: string; userAgent?: string },
  ): Promise<UserToken> => {
    const userTokenDoc = await userTokenModel.create({
      userId: new Types.ObjectId(userId),
      token,
      jti: metadata?.jti,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      lastUsedAt: new Date(),
    });

    return convertUserDocToUserToken(userTokenDoc);
  },

  markTokenUsed: async (token: string) => {
    await userTokenModel
      .updateOne(
        { token },
        {
          $set: { lastUsedAt: new Date() },
        },
      )
      .exec();
  },

  findUserTokenByToken: async (token: string) => {
    const userTokenDoc = await userTokenModel.findOne({ token }).exec();

    if (!userTokenDoc) {
      return null;
    }

    return convertUserDocToUserToken(userTokenDoc);
  },

  findAllUserTokensByUserId: async (userId: string) => {
    const userTokenDocs = await userTokenModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: 1 })
      .exec();

    return userTokenDocs.map(doc => convertUserDocToUserToken(doc));
  },

  removeUserTokenById: async (userId: string) => {
    const userTokenDoc = await userTokenModel
      .findOneAndDelete({
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!userTokenDoc) {
      return null;
    }

    return convertUserDocToUserToken(userTokenDoc);
  },

  removeUserTokenByToken: async (token: string) => {
    const userTokenDoc = await userTokenModel.findOneAndDelete({ token }).exec();

    if (!userTokenDoc) {
      return null;
    }

    return convertUserDocToUserToken(userTokenDoc);
  },

  removeAllUserTokensById: async (userId: string) =>
    userTokenModel
      .deleteMany({
        userId: new Types.ObjectId(userId),
      })
      .exec(),
};
