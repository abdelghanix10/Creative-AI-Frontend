import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { type DefaultSession, type NextAuthConfig, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "~/schemas/auth";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username?: string;
      subscriptionTier?: string;
      role?: string;
      isActive?: boolean;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    // ...other properties
    username?: string | null;
    subscriptionTier?: string | null;
    role?: string | null;
    isActive?: boolean | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    username?: string;
    subscriptionTier?: string;
    role?: string;
    isActive?: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        emailOrUsername: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { emailOrUsername, password } =
            await signInSchema.parseAsync(credentials);

          // Try to find user by email first, then by username
          let user = await db.user.findUnique({
            where: {
              email: emailOrUsername,
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              username: true,
              password: true,
              subscriptionTier: true,
              role: true,
              isActive: true,
            },
          });

          // If not found by email, try username (case-insensitive)
          if (!user) {
            const allUsers = await db.user.findMany({
              where: {
                username: {
                  not: null,
                },
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                username: true,
                password: true,
                subscriptionTier: true,
                role: true,
                isActive: true,
              },
            });

            user =
              allUsers.find(
                (u) =>
                  u.username?.toLowerCase() === emailOrUsername.toLowerCase(),
              ) ?? null;
          }

          if (!user) {
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.password);

          if (!passwordMatch) {
            return null;
          }

          // Check if the account is active after password verification
          if (!user.isActive) {
            // Return null and let the client handle the deactivated account
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            username: user.username,
            subscriptionTier: user.subscriptionTier,
            role: user.role,
            isActive: user.isActive,
          } as User;
        } catch {
          return null;
        }
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  pages: {
    signIn: "/app/sign-in",
  },
  session: { strategy: "jwt" },
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub!,
          username: token.username,
          subscriptionTier: token.subscriptionTier,
          role: token.role,
          isActive: token.isActive,
        },
      };
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.username = user.username ?? undefined;
        token.subscriptionTier = user.subscriptionTier ?? undefined;
        token.role = user.role ?? undefined;
        token.isActive = user.isActive ?? undefined;
      }

      // If we don't have username, subscriptionTier, role, or isActive in token but have user id, fetch them from database
      if (
        token.sub &&
        (!token.username ||
          !token.subscriptionTier ||
          !token.role ||
          token.isActive === undefined)
      ) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.sub },
            select: {
              username: true,
              subscriptionTier: true,
              role: true,
              isActive: true,
            },
          });
          if (dbUser) {
            if (dbUser.username) {
              token.username = dbUser.username;
            }
            if (dbUser.subscriptionTier) {
              token.subscriptionTier = dbUser.subscriptionTier;
            }
            if (dbUser.role) {
              token.role = dbUser.role;
            }
            // Explicitly check for boolean value
            if (dbUser.isActive !== null && dbUser.isActive !== undefined) {
              token.isActive = dbUser.isActive;
            }
          }
        } catch (error) {
          console.error("Error fetching user data for token:", error);
        }
      }

      // Handle session updates (when update() is called from frontend)
      if (trigger === "update") {
        // Always fetch fresh data from database when session is updated
        if (token.sub) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.sub },
              select: {
                username: true,
                subscriptionTier: true,
                role: true,
                isActive: true,
              },
            });
            if (dbUser) {
              token.username = dbUser.username ?? undefined;
              token.subscriptionTier = dbUser.subscriptionTier ?? undefined;
              token.role = dbUser.role ?? undefined;
              token.isActive = dbUser.isActive ?? undefined;
            }
          } catch (error) {
            console.error(
              "Error fetching fresh user data for token update:",
              error,
            );
          }
        }

        // Also handle explicit session updates
        if (session) {
          const sessionUpdate = session as {
            name?: string;
            email?: string;
            subscriptionTier?: string;
            role?: string;
          };
          if (sessionUpdate.name) {
            token.name = sessionUpdate.name;
          }
          if (sessionUpdate.email) {
            token.email = sessionUpdate.email;
          }
          if (sessionUpdate.subscriptionTier) {
            token.subscriptionTier = sessionUpdate.subscriptionTier;
          }
          if (sessionUpdate.role) {
            token.role = sessionUpdate.role;
          }
        }
      }

      return token;
    },
  },
} satisfies NextAuthConfig;
