import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, DbUser } from '../database/db';
import { config } from '../config/env';

export interface UserSessionPayload {
  userId: string;
  emailOrPhone: string;
  role: string;
  subscriptionTier: string;
}

export class AuthService {
  private readonly JWT_SECRET: string = config.JWT_SECRET;
  private readonly TOKEN_EXPIRY: string = '7d';

  public async register(params: {
    emailOrPhone: string;
    password: string;
    name: string;
    role?: 'driver' | 'owner_operator' | 'fleet_manager';
    companyName?: string;
  }): Promise<{ user: Omit<DbUser, 'password_hash'>; token: string }> {
    const existing = await db.findUserByEmailOrPhone(params.emailOrPhone);
    if (existing) {
      throw new Error('An account with this email or phone number already exists.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    const newUser: DbUser = await db.createUser({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email_or_phone: params.emailOrPhone.trim().toLowerCase(),
      password_hash: passwordHash,
      name: params.name.trim(),
      role: params.role || 'driver',
      subscription_tier: 'free',
      company_name: params.companyName?.trim(),
      language_preference: 'en',
    });

    const token = this.generateToken(newUser);
    const { password_hash, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  public async login(
    emailOrPhone: string,
    password: string
  ): Promise<{ user: Omit<DbUser, 'password_hash'>; token: string }> {
    const user = await db.findUserByEmailOrPhone(emailOrPhone);
    if (!user) {
      throw new Error('Invalid credentials. Please verify your phone/email and password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid credentials. Please verify your phone/email and password.');
    }

    const token = this.generateToken(user);
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public verifyToken(token: string): UserSessionPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as UserSessionPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  private generateToken(user: DbUser): string {
    const payload: UserSessionPayload = {
      userId: user.id,
      emailOrPhone: user.email_or_phone,
      role: user.role,
      subscriptionTier: user.subscription_tier,
    };
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' });
  }
}

export const authService = new AuthService();
