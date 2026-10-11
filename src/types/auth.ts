/**
 * Authentication & Authorization Types
 */

export interface User {
  id: string;
  name: string;
  phoneOrEmail: string;
  role: 'driver' | 'fleet_owner' | 'dispatcher';
  subscriptionTier: 'free' | 'pro' | 'fleet';
  companyName?: string;
  createdAt: string;
}

export interface AuthSession {
  user: User | null;
  token?: string;
  isAuthenticated: boolean;
  expiresAt?: string;
}

export interface SignInCredentials {
  identifier: string; // Phone or Email
  password: string;
}

export interface SignUpCredentials {
  name: string;
  identifier: string; // Phone or Email
  password: string;
  role: 'driver' | 'fleet_owner' | 'dispatcher';
  companyName?: string;
}
