import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { userService } from '../../../services/UserService';
import { toApiUser } from '../../../utils/userUtils';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        // Find user and include password for comparison
        const user = await userService.findByEmail(credentials.email, true);

        if (!user) {
          console.log('No user found with email:', credentials.email);
          throw new Error('No user found with this email');
        }

        if (user.isBlocked) {
          console.log('Blocked user attempted login:', credentials.email);
          throw new Error('Account is blocked');
        }

        const isValid = await user.comparePassword(credentials.password);
        
        if (!isValid) {
          console.log('Invalid password for user:', credentials.email);
          throw new Error('Invalid credentials');
        }

        // Convert Mongoose document to API user format
        return toApiUser(user);
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isBlocked = user.isBlocked;
        token.createdAt = user.createdAt.toISOString();
        token.updatedAt = user.updatedAt.toISOString();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin';
        session.user.isBlocked = token.isBlocked as boolean;
        session.user.createdAt = new Date(token.createdAt as string);
        session.user.updatedAt = new Date(token.updatedAt as string);
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
