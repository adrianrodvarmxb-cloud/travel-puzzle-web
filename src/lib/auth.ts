import NextAuth, { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validations/auth';

export const authConfig: NextAuthConfig = {
  trustHost: true, // Trust the host (fixes UntrustedHost error in development)
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate input
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
          },
        });

        if (!user) return null;

        // Check if user has a password (OAuth users won't have one)
        if (!user.password) return null;

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        // Return user (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in (Google)
      if (account?.provider === 'google' && user.email) {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user for OAuth
            const userName = user.name || (profile as any)?.name || user.email?.split('@')[0] || null;
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: userName,
                password: '', // OAuth users don't have passwords
                role: 'CLIENT',
              },
            });
            user.id = newUser.id;
            user.role = newUser.role;
          } else {
            // Update user info if needed
            if (existingUser.name !== user.name && user.name) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { name: user.name },
              });
            }
            user.id = existingUser.id;
            user.role = existingUser.role;
          }
        } catch (error) {
          console.error('Error during OAuth sign-in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Add role and id to token on signin
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Add role and id to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'CLIENT' | 'ADMIN';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

