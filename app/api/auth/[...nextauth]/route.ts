import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import connectToDatabase from "@/lib/db";
import { User, IUser } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { isStudentEmail } from "@/lib/edu-domains";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "student@prnc.tu.edu.np" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user || (!user.password && user.email)) {
          // If the user signed up with Google originally, they won't have a password.
          throw new Error("Invalid password or user signed up via Google.");
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await connectToDatabase();

        let dbUser = await User.findOne({ email: user.email?.toLowerCase() });

        // Auto-register first-time Google sign-ins
        if (!dbUser && user.email) {
          // If their google account happens to be a .edu domain, instantly mark them!
          const autoStudent = isStudentEmail(user.email);

          dbUser = await User.create({
            email: user.email.toLowerCase(),
            name: user.name,
            image: user.image,
            isStudent: autoStudent,
            studentEmail: autoStudent ? user.email.toLowerCase() : undefined,
          });
        } else if (dbUser && user.image && dbUser.image !== user.image) {
          // Update missing/changed image on subsequent sign-ins
          dbUser.image = user.image;
          await dbUser.save();
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // First login -> attach user id to token
        token.id = user.id;
        token.image = user.image;
      }

      // On every request, fetch the latest user info from DB 
      // since isStudent can change mid-session when they verify their email.
      if (token.email) {
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: token.email.toLowerCase() });
          if (dbUser) {
            token.isStudent = !!dbUser.isStudent;
            token.studentEmail = dbUser.studentEmail;
            token.id = dbUser._id.toString();
            token.verificationStatus = dbUser.verificationStatus || "none";
            token.image = dbUser.image || token.image || (token as any).picture;
          }
        } catch (e) {
          console.error("JWT Session Callback Error:", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).isStudent = token.isStudent;
        (session.user as any).studentEmail = token.studentEmail;
        (session.user as any).verificationStatus = token.verificationStatus || "none";
        (session.user as any).image = token.image || (token as any).picture || null;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
