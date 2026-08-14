import type { Metadata } from 'next';
import Link from 'next/link';
import ModeBadge from '@/components/ModeBadge';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpsDesk — support triage & reply drafting',
  description:
    'Classify inbound customer email, attach the matching order, draft the reply in brand voice, and flag what a human must own.',
};

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/library', label: 'Response library' },
  { href: '/settings', label: 'Settings' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
                OpsDesk<span className="ml-2 font-normal text-slate-400">support triage</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-slate-900">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto">
                <ModeBadge />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500">
            Demo build. Messages and orders are seeded fixtures; your edits, drafts and approvals live in your
            own browser cookie and reset when you clear it.
          </footer>
        </div>
      </body>
    </html>
  );
}
