import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './Callback.module.css';

export default function AuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      try {
        // This finishes the OAuth redirect flow and returns the session or error
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          console.error('getSessionFromUrl error', error);
          setStatus('error');
          setMessage(error.message ?? String(error));
          return;
        }

        // On success data.session will be populated. Redirect to app area.
        setStatus('success');
        setMessage('Signed in successfully — redirecting...');

        // optional: read redirectTo param from URL and navigate there
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirectTo') || '/';
        setTimeout(() => {
          window.location.replace(redirectTo);
        }, 800);
      } catch (err: any) {
        console.error('callback handling failed', err);
        setStatus('error');
        setMessage(err?.message ?? String(err));
      }
    }

    handle();
  }, []);

  return (
    <div className={styles.container}>
      {status === 'processing' && <p>Processing sign-in...</p>}
      {status === 'success' && <p className={styles.success}>{message}</p>}
      {status === 'error' && <p className={styles.error}>Error: {message}</p>}
    </div>
  );
}
