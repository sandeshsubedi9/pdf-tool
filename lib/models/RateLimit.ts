import mongoose, { Document, Schema } from "mongoose";

export interface IRateLimit extends Document {
  key: string;      // e.g., 'fp:xyz' or 'uid:123'
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, required: true, default: 1 },
  // Optional: Auto-delete the document 24 hours after resetAt to clean up the database automatically
  resetAt: { type: Date, required: true, index: { expires: '24h' } },
});

export const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
