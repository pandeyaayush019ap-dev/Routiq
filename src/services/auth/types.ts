import { AuthSession, SignInCredentials, SignUpCredentials, User } from '../../types/auth';

export interface IAuthService {
  getSession(): Promise<AuthSession>;
  signIn(credentials: SignInCredentials): Promise<AuthSession>;
  signUp(credentials: SignUpCredentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
}
