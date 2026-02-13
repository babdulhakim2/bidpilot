import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BidPilot — Your AI Copilot for Government Contracts',
  description: 'AI-powered tender matching & proposal generation for Nigerian contractors. Never miss a government contract again.',
  keywords: 'government contracts, tenders, procurement, Nigeria, bidding, proposals',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F766E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  )
}
