import NextAuth from "next-auth";
import { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "@/lib/auth";
import { rateLimit, authRateLimit } from "@/lib/rate-limit";

// Create the NextAuth handler
const nextAuthHandler = NextAuth(authOptions);

// Wrap with rate limiting
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only apply rate limiting to signin and callback endpoints
  const isAuthEndpoint =
    req.url?.includes('/signin') ||
    req.url?.includes('/callback/credentials');

  if (isAuthEndpoint && req.method === 'POST') {
    const rateLimitMiddleware = rateLimit(authRateLimit);

    return new Promise<void>((resolve, reject) => {
      rateLimitMiddleware(req, res, async () => {
        try {
          await nextAuthHandler(req, res);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // No rate limiting for other NextAuth routes
  return nextAuthHandler(req, res);
}
