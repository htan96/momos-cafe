export type AuthUser = {
  sub: string;
  username: string;
  email: string | null;
  groups: string[];
};

/**
 * Pluggable auth surface so Cognito can be swapped or augmented with
 * social / enterprise IdPs later without rewiring call sites.
 */
export type AuthSignInResult =
  | {
      ok: true;
      user: AuthUser;
      /** Opaque bundles for transports that persist tokens separately (e.g. Cognito httpOnly cookies). */
      sessionTokens?: { idToken: string; accessToken: string; refreshToken?: string };
    }
  | {
      ok: false;
      error: string;
      /** When the IdP requires an extra challenge (e.g. MFA). */
      challenge?: { name: string; session?: string };
    };

export interface AuthProvider {
  readonly id: string;
  signInWithPassword(params: { username: string; password: string }): Promise<AuthSignInResult>;
  signOut(params: { accessToken?: string }): Promise<void>;
  refreshSession(params: { refreshToken: string; idTokenUsername: string }): Promise<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  } | null>;
}
