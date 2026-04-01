import nodemailer from "nodemailer";

const host = process.env.EMAIL_SERVER_HOST;       // e.g., smtp.gmail.com
const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
const user = process.env.EMAIL_SERVER_USER;
const pass = process.env.EMAIL_SERVER_PASSWORD;
const from = process.env.EMAIL_FROM || "noreply@pdftool.app"; // Fallback if missing

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: { user, pass },
});

export async function sendVerificationEmail(
  to: string,
  verificationCode: string
) {
  const mailOptions = {
    from: `"PDFTool" <${from}>`,
    to,
    subject: `🎓 ${verificationCode} is your PDFTool verification code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #f97316;">Verify your student email</h2>
        <p>You requested to verify <strong>${to}</strong> to unlock unlimited free conversions on PDFTool.</p>
        <p>Your 6-digit verification code is:</p>
        <div style="margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background: #f1f5f9; padding: 12px 24px; border-radius: 8px;">
            ${verificationCode}
          </span>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} PDFTool. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending verification email via Nodemailer", err);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetCode: string
) {
  const mailOptions = {
    from: `"PDFTool" <${from}>`,
    to,
    subject: `🔒 ${resetCode} is your PDFTool password reset code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #0f172a;">Reset your password</h2>
        <p>You requested to reset the password for your <strong>${to}</strong> account on PDFTool.</p>
        <p>Your 6-digit verification code is:</p>
        <div style="margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background: #f1f5f9; padding: 12px 24px; border-radius: 8px;">
            ${resetCode}
          </span>
        </div>
        <p>This code will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} PDFTool. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending password reset email via Nodemailer", err);
  }
}

// ─── Admin: New verification request notification ────────────────────────────

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  student_id: "Student ID Card",
  admission_letter: "Admission / Enrollment Letter",
  fee_receipt: "Fee Receipt",
  marksheet: "Marksheet / Report Card",
  other: "Other Document",
};

export async function sendAdminVerificationRequestEmail(opts: {
  userName: string;
  userEmail: string;
  institutionName: string;
  documentType: string;
  verificationId: string;
}) {
  const docLabel = DOCUMENT_TYPE_LABELS[opts.documentType] || opts.documentType;

  const mailOptions = {
    from: `"PDFTool Admin" <${from}>`,
    to: "hr@fishtailinfosolutions.com",
    subject: `🎓 New Student Verification Request — ${opts.userName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 28px 32px;">
          <h2 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">📋 New Student Verification Request</h2>
          <p style="color: #94a3b8; margin: 6px 0 0; font-size: 14px;">Action required — please review the submitted document.</p>
        </div>
        <div style="padding: 28px 32px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Student Name</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${opts.userName}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email</td>
              <td style="padding: 8px 0; color: #1e293b;">${opts.userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Institution</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 700;">${opts.institutionName}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Document Type</td>
              <td style="padding: 8px 0; color: #1e293b;">${docLabel}</td>
            </tr>
          </table>
        </div>
        <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} PDFTool. This is an automated admin notification.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending admin verification request email", err);
  }
}

// ─── Student: Decision email (approved / rejected) ───────────────────────────

export async function sendStudentVerificationDecisionEmail(opts: {
  to: string;
  userName: string;
  approved: boolean;
  adminNote?: string;
}) {
  const subject = opts.approved
    ? "🎉 Your Student Verification is Approved — PDFTool"
    : "📋 Update on your Student Verification — PDFTool";

  const headerBg = opts.approved
    ? "linear-gradient(135deg, #065f46 0%, #047857 100%)"
    : "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)";

  const statusBadge = opts.approved
    ? `<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-weight:700;font-size:13px;">✅ APPROVED</span>`
    : `<span style="background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:20px;font-weight:700;font-size:13px;">❌ NOT APPROVED</span>`;

  const bodyContent = opts.approved
    ? `<p style="color:#374151;font-size:15px;">Great news, <strong>${opts.userName}</strong>! Your student identity document has been reviewed and verified. You now have <strong style="color:#047857;">Unlimited Free Conversions</strong> on PDFTool.</p>
       <p style="color:#374151;font-size:15px;">You can now head back to PDFTool and enjoy all tools without any limits.</p>`
    : `<p style="color:#374151;font-size:15px;">Hi <strong>${opts.userName}</strong>, we reviewed your student identity document but were unable to verify it at this time.</p>
       ${opts.adminNote ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#92400e;"><strong>Reason:</strong> ${opts.adminNote}</p></div>` : ""}
       <p style="color:#374151;font-size:15px;">You can re-submit with a clearer or different document at any time from your Account Settings.</p>`;

  const mailOptions = {
    from: `"PDFTool" <${from}>`,
    to: opts.to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: ${headerBg}; padding: 28px 32px;">
          <h2 style="color: #fff; margin: 0; font-size: 20px;">Student Verification Update</h2>
        </div>
        <div style="padding: 28px 32px;">
          <div style="margin-bottom: 20px;">${statusBadge}</div>
          ${bodyContent}
        </div>
        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">© ${new Date().getFullYear()} PDFTool. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Error sending student decision email", err);
  }
}

// ─── Admin Marketing: Promotional Reminder ────────────────────────────────

export async function sendMarketingReminderEmail(toLine: string[]) {
  // If no recipients, do nothing
  if (!toLine || toLine.length === 0) return;

  const mailOptions = {
    from: `"PDFTool Team" <${from}>`,
    bcc: toLine, // Send to all anonymously
    subject: "Your Free PDF Toolbox is waiting for you! 🛠️",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #047C58; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Got PDFs to edit? 👋</h1>
        </div>
        
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #334155; margin-top: 0;">Hi there,</p>
          <p style="font-size: 16px; color: #334155;">Just a quick reminder that PDFTool is always open and ready whenever you need to get work done!</p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-weight: bold; color: #0f172a;">✨ Everything you need in one place:</p>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 8px;">Merge, split, or compress large PDF files easily</li>
              <li style="margin-bottom: 8px;">Convert between PDF, Word, JPG, and more</li>
              <li>Completely free to start using with no hidden fees</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; color: #334155; margin-bottom: 32px;">Whenever you need to read, sign, or organize a document, we have you covered in seconds.</p>
          
          <div style="text-align: center;">
            <a href="https://pdftool.com" style="display: inline-block; background: #047C58; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px;">Open PDFTool</a>
          </div>
        </div>
        
        <div style="background:#f8fafc; padding:20px; border-top:1px solid #e2e8f0; text-align: center;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">You are receiving this because you registered at PDFTool.</p>
          <p style="font-size:12px;color:#94a3b8;margin:8px 0 0 0;">© ${new Date().getFullYear()} PDFTool. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Mass marketing email failed:", err);
    throw err;
  }
}
