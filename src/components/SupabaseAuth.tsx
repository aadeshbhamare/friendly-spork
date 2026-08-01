import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import styles from './SupabaseAuth.module.css';

export default function SupabaseAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes to react to redirects/popups
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Typical events: SIGNED_IN, SIGNED_OUT, USER_UPDATED
      console.log('onAuthStateChange', event, session);
      if (event === 'SIGNED_IN') {
        setMessage('Signed in successfully');
        setError(null);
        // Redirect or reload as needed
        // window.location.href = '/';
      }
      if (event === 'SIGNED_OUT') {
        setMessage('Signed out');
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider });
      if (signInError) {
        setError(signInError.message);
      } else {
        setMessage('Redirecting to provider for authentication...');
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage('Check your email for a confirmation link (if email confirmation is enabled).');
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else if (data?.session) {
        setMessage('Signed in successfully');
        // window.location.href = '/';
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessage('Signed out');
  }

  return (
    <div className={styles.container}>
      <h3>Sign in / Sign up</h3>

      {error ? <div className={styles.error}>⚠ {error}</div> : null}
      {message ? <div className={styles.message}>ℹ {message}</div> : null}

      <div className={styles.oauthRow}>
        <button onClick={() => handleOAuthSignIn('google')} disabled={loading} className={styles.google}>
          Sign in with Google
        </button>
        <button onClick={() => handleOAuthSignIn('github')} disabled={loading} className={styles.github}>
          Sign in with GitHub
        </button>
      </div>

      <hr />

      <form onSubmit={handleEmailSignIn} className={styles.form}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            Sign in
          </button>
          <button onClick={handleEmailSignUp} disabled={loading}>
            Create account
          </button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSignOut}>Sign out</button>
      </div>

      <div className={styles.hint}>
        <strong>Important:</strong> If you receive a "Unsupported provider: provider is not enabled" error when
        signing in with Google, enable the provider in the Supabase project settings (Authentication → Providers)
        and add the required Google Cloud OAuth credentials and redirect URI. See docs/SUPABASE_SETUP.md.
      </div>
    </div>
  );
}
