import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'DriveGram',
    template: '%s | DriveGram',
  },
  description: 'Modern cloud workspace powered by Telegram storage',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background font-sans antialiased">
            {children}
          </div>
          <Toaster
            position="top-right"
            gutter={10}
            containerStyle={{
              top: 76,
              right: 16,
            }}
            toastOptions={{
              duration: 3200,
              className: 'dg-toast',
              style: {
                maxWidth: '360px',
              },
              success: {
                className: 'dg-toast dg-toast-success',
                iconTheme: {
                  primary: 'hsl(var(--primary))',
                  secondary: 'hsl(var(--primary-foreground))',
                },
              },
              error: {
                className: 'dg-toast dg-toast-error',
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--destructive-foreground))',
                },
              },
              loading: {
                className: 'dg-toast',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
