import { IAuthService } from './types';
import { AuthSession, SignInCredentials, SignUpCredentials, User } from '../../types/auth';

const AUTH_STORAGE_KEY = 'routiq_auth_session';

const DEMO_USER: User = {
  id: 'usr_demo_101',
  name: 'Rajesh Kumar (राजेश कुमार)',
  phoneOrEmail: '+91 98765 43210',
  role: 'driver',
  subscriptionTier: 'pro',
  companyName: 'Shivneri Road Freight Lines, Pune',
  createdAt: '2025-06-15T10:00:00Z',
};

export class ClientAuthService implements IAuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadFromStorage();
  }

  private loadFromStorage(): AuthSession {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // storage unavailable
    }
    return { user: null, isAuthenticated: false };
  }

  private saveToStorage(session: AuthSession): void {
    this.currentSession = session;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // storage unavailable
    }
  }

  public async getSession(): Promise<AuthSession> {
    return this.currentSession;
  }

  public getCurrentUser(): User | null {
    return this.currentSession.user;
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const user: User = {
      id: `usr_${Date.now()}`,
      name: credentials.identifier.includes('@') ? credentials.identifier.split('@')[0] : 'Truck Driver',
      phoneOrEmail: credentials.identifier,
      role: 'driver',
      subscriptionTier: 'free',
      createdAt: new Date().toISOString(),
    };

    const session: AuthSession = {
      user: credentials.identifier ? user : DEMO_USER,
      token: `demo_jwt_token_${Date.now()}`,
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };

    this.saveToStorage(session);
    return session;
  }

  public async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const user: User = {
      id: `usr_${Date.now()}`,
      name: credentials.name,
      phoneOrEmail: credentials.identifier,
      role: credentials.role,
      subscriptionTier: 'free',
      companyName: credentials.companyName,
      createdAt: new Date().toISOString(),
    };

    const session: AuthSession = {
      user,
      token: `demo_jwt_token_${Date.now()}`,
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };

    this.saveToStorage(session);
    return session;
  }

  public async signOut(): Promise<void> {
    const session: AuthSession = { user: null, isAuthenticated: false };
    this.saveToStorage(session);
  }

  public async signInWithDemo(): Promise<AuthSession> {
    const session: AuthSession = {
      user: DEMO_USER,
      token: `demo_jwt_token_${Date.now()}`,
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };
    this.saveToStorage(session);
    return session;
  }
}

export const authService = new ClientAuthService();
