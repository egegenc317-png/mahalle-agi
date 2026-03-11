// @ts-nocheck
import { compare } from "bcryptjs";
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

if (process.env.NODE_ENV === "production") {
  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === "change-me") {
    throw new Error("Production icin guclu bir NEXTAUTH_SECRET tanimlanmali.");
  }
  if (!process.env.APP_ENCRYPTION_SECRET || process.env.APP_ENCRYPTION_SECRET.length < 32) {
    throw new Error("Production icin en az 32 karakterlik APP_ENCRYPTION_SECRET tanimlanmali.");
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-posta veya kullanıcı adı", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const identifier = credentials.email.trim().toLowerCase();
        const allUsers = await prisma.user.findMany();
        const user =
          allUsers.find(
            (item: { email: string; username?: string | null }) =>
              item.email.toLowerCase() === identifier || (item.username || "").toLowerCase() === identifier
          ) || null;
        if (!user) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        if (user.suspendedUntil && user.suspendedUntil > new Date()) {
          throw new Error("Hesap askiya alinmis.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          neighborhoodId: user.neighborhoodId,
          locationScope: user.locationScope ?? null,
          accountType: user.accountType ?? "NEIGHBOR"
        } as never;
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.neighborhoodId = (user as { neighborhoodId?: string | null }).neighborhoodId ?? null;
        token.locationScope = (user as { locationScope?: "NEIGHBORHOOD" | "DISTRICT" | null }).locationScope ?? null;
        token.accountType = (user as { accountType?: "NEIGHBOR" | "BUSINESS" }).accountType ?? "NEIGHBOR";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        const dbUser = token.sub ? await prisma.user.findUnique({ where: { id: token.sub } }) : null;
        session.user.role = dbUser?.role || (token.role as string) || "USER";
        session.user.neighborhoodId = dbUser?.neighborhoodId ?? (token.neighborhoodId as string | null) ?? null;
        session.user.locationScope =
          dbUser?.locationScope ??
          (token.locationScope as "NEIGHBORHOOD" | "DISTRICT" | null) ??
          null;
        session.user.accountType =
          dbUser?.accountType ??
          (token.accountType as "NEIGHBOR" | "BUSINESS") ??
          "NEIGHBOR";
      }
      return session;
    }
  }
};

export function auth() {
  return getServerSession(authOptions);
}

