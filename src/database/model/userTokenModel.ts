import mongoose, { Document, ObjectId } from "mongoose";

const { Schema } = mongoose;

export interface UserTokenModel extends Document {
  userId: ObjectId;
  token: string;
  jti?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

const UserTokenSchema = new Schema<UserTokenModel>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: "Users" },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  jti: {
    type: String,
    index: true,
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
});

export default mongoose.model<UserTokenModel>("UserTokens", UserTokenSchema);
