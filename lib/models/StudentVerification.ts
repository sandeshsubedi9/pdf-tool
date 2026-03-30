import mongoose, { Schema, Document } from "mongoose";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface IStudentVerification extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName?: string;
  institutionName: string;
  documentType: "student_id" | "admission_letter" | "fee_receipt" | "marksheet" | "other";
  documentUrl: string;       // Stored filename/path on disk
  documentMimeType: string;
  status: VerificationStatus;
  adminNote?: string;         // Reason for rejection (optional)
  submittedAt: Date;
  reviewedAt?: Date;
}

const StudentVerificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    institutionName: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      enum: ["student_id", "admission_letter", "fee_receipt", "marksheet", "other"],
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    documentMimeType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const StudentVerification =
  mongoose.models.StudentVerification ||
  mongoose.model<IStudentVerification>("StudentVerification", StudentVerificationSchema);
