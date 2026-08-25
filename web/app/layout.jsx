import './globals.css'
import { Metadata } from 'next'

export const metadata = {
  title: 'Daily Stock Magazine - Pre-Market Intelligence',
  description: 'Daily pre-market stock intelligence magazine with bilingual (English + Hebrew) analysis. 8 top movers under $30 with news, sentiment, and technical analysis.',
  keywords: ['stock market', 'pre-market', 'israel', 'trading', 'stocks'],
  openGraph: {
    title: 'Daily Stock Magazine',
    description: 'Pre-market stock intelligence magazine',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    type: 'website',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="bg-slate-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
