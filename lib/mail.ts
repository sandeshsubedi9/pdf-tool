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
  verificationCode: string,
  verificationLink: string
) {
  const mailOptions = {
    from: `"PDFTool" <${from}>`,
    to,
    subject: "🎓 Verify your university email on PDFTool",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #f97316;">Verify your student email</h2>
        <p>You requested to verify <strong>${to}</strong> to unlock unlimited free conversions on PDFTool.</p>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>You can also click the button below to verify automatically:</p>
        <div style="margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: #f97316; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
             Verify Student Email
          </a>
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
