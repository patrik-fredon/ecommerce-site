import { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </SessionProvider>
  );
}

// Ensure seedDefaultAdmin is called only on the server-side during development.
// This prevents Mongoose (and its side effects) from being bundled and executed in the browser.
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  import('../lib/seedAdmin').then(({ seedDefaultAdmin }) => {
    seedDefaultAdmin().catch(console.error);
  });
}

export default MyApp;
