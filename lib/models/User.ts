import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;       // Primary login email (e.g. Gmail)
  name?: string;
  password?: string;   // Optional (if using Google OAuth)
  
  // Student & Verification Fields
  isStudent: boolean;
  studentEmail?: string;
  emailVerified: boolean;
  verificationToken?: string;
  tokenExpiresAt?: Date;

  // Document-based verification
  verificationStatus: "none" | "pending" | "approved" | "rejected";

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
    },
    isStudent: {
      type: Boolean,
      default: false,
    },
    studentEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    tokenExpiresAt: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation error in Next.js development
export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
