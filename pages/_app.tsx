import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '../components/providers/theme-provider'
import { MotionProvider } from '../components/providers/motion-provider'
import { ToastProvider } from '../components/providers/toast-provider'
import { ErrorBoundary } from '../components/ui/error-boundary'
import { MainLayout } from '../components/layout/main-layout'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>AgroTrack+ - Farm-to-Table Subscription Platform</title>
        <meta name="description" content="Connect directly with local farmers for the freshest, most sustainable produce delivered to your door." />
      </Head>
      <SessionProvider session={session}>
        <ErrorBoundary>
          <ThemeProvider>
            <MotionProvider>
              <MainLayout session={session}>
                <Component {...pageProps} />
              </MainLayout>
              <ToastProvider />
            </MotionProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SessionProvider>
    </>
  )
}