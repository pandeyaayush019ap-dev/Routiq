import { IAuthService } from './types';
import { AuthSession, SignInCredentials, SignUpCredentials, User } from '../../types/auth';

const AUTH_STORAGE_KEY = 'routiq_auth_session';

export class ProductionAuthService implements IAuthService {
  private currentSession: AuthSession;

  constructor() {
    this.currentSession = this.loadFromStorage();
    this.verifyAndRefreshSession();
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

  private async verifyAndRefreshSession(): Promise<void> {
    if (!this.currentSession.token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.currentSession.token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const updated: AuthSession = {
            ...this.currentSession,
            user: {
              id: data.user.id,
              name: data.user.name,
              phoneOrEmail: data.user.email_or_phone,
              role: data.user.role,
              subscriptionTier: data.user.subscription_tier,
              companyName: data.user.company_name,
              createdAt: data.user.created_at,
            },
            isAuthenticated: true,
          };
          this.saveToStorage(updated);
        }
      } else if (res.status === 401) {
        // Expired token
        this.saveToStorage({ user: null, isAuthenticated: false });
      }
    } catch {
      // Network unreachable, keep offline session
    }
  }

  public async getSession(): Promise<AuthSession> {
    return this.currentSession;
  }

  public getCurrentUser(): User | null {
    return this.currentSession.user;
  }

  public async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Invalid phone/email or password.');
      }

      const data = await response.json();
      const user: User = {
        id: data.user.id,
        name: data.user.name,
        phoneOrEmail: data.user.email_or_phone,
        role: data.user.role,
        subscriptionTier: data.user.subscription_tier,
        companyName: data.user.company_name,
        createdAt: data.user.created_at,
      };

      const session: AuthSession = {
        user,
        token: data.token,
        isAuthenticated: true,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      this.saveToStorage(session);
      return session;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      throw new Error(msg);
    }
  }

  public async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
          name: credentials.name,
          role: credentials.role,
          companyName: credentials.companyName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Registration failed.');
      }

      const data = await response.json();
      const user: User = {
        id: data.user.id,
        name: data.user.name,
        phoneOrEmail: data.user.email_or_phone,
        role: data.user.role,
        subscriptionTier: data.user.subscription_tier,
        companyName: data.user.company_name,
        createdAt: data.user.created_at,
      };

      const session: AuthSession = {
        user,
        token: data.token,
        isAuthenticated: true,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      };

      this.saveToStorage(session);
      return session;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      throw new Error(msg);
    }
  }

  public async signOut(): Promise<void> {
    try {
      if (this.currentSession.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.currentSession.token}` },
        });
      }
    } catch {
      // ignore
    }
    const session: AuthSession = { user: null, isAuthenticated: false };
    this.saveToStorage(session);
  }

  public async signInWithDemo(): Promise<AuthSession> {
    // In production, register or sign in a designated demo account via backend
    try {
      return await this.signIn({
        identifier: 'driver@routiq.app',
        password: 'Password123!',
      });
    } catch {
      // If demo user does not exist yet, register it
      try {
        return await this.signUp({
          name: 'Rajesh Kumar (राजेश कुमार)',
          identifier: 'driver@routiq.app',
          password: 'Password123!',
          role: 'driver',
          companyName: 'Shivneri Road Freight Lines, Pune',
        });
      } catch {
        // Fallback
        const fallbackUser: User = {
          id: 'usr_driver_demo',
          name: 'Rajesh Kumar (राजेश कुमार)',
          phoneOrEmail: 'driver@routiq.app',
          role: 'driver',
          subscriptionTier: 'pro',
          companyName: 'Shivneri Road Freight Lines, Pune',
          createdAt: new Date().toISOString(),
        };
        const session: AuthSession = {
          user: fallbackUser,
          token: 'demo_session_token',
          isAuthenticated: true,
        };
        this.saveToStorage(session);
        return session;
      }
    }
  }
}

export const authService = new ProductionAuthService();
