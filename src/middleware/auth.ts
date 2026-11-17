import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, hasAdminServiceAccount } from '../lib/firebase-admin.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

export interface AuthRequest extends Request {
  user?: Partial<DecodedIdToken> & {
    uid: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
}

async function verifyViaIdentityToolkitRest(idToken: string): Promise<AuthRequest['user'] | null> {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => null);
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user?.localId) return null;
    return {
      uid: String(user.localId),
      email: typeof user.email === 'string' ? user.email.toLowerCase() : '',
      email_verified: Boolean(user.emailVerified),
      name: typeof user.displayName === 'string' ? user.displayName : undefined,
    };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing Bearer ID token.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty Bearer token.' });
    return;
  }

  // Never trust legacy mock custom tokens
  if (
    token.startsWith('custom_') ||
    token.startsWith('token_') ||
    token.startsWith('user_') ||
    token === 'admin_token'
  ) {
    res.status(401).json({ error: 'Unauthorized: Legacy session tokens are no longer accepted. Please sign in again.' });
    return;
  }

  if (hasAdminServiceAccount()) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = {
        ...decodedToken,
        uid: decodedToken.uid,
        email: (decodedToken.email || '').toLowerCase(),
        email_verified: Boolean(decodedToken.email_verified),
        name: decodedToken.name,
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase ID token.' });
      return;
    }
  }

  // When FIREBASE_SERVICE_ACCOUNT_JSON is not set, cryptographically validate the Firebase ID token via Identity Toolkit
  const verifiedUser = await verifyViaIdentityToolkitRest(token);
  if (!verifiedUser) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired Firebase ID token.' });
    return;
  }

  req.user = verifiedUser;
  next();
};
