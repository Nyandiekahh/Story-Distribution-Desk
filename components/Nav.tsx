'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/stories', label: 'Stories' },
  { href: '/channels', label: 'Channels' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/jobs', label: 'Queue' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
          Story Distribution Desk
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-2.5 py-1.5 ${
                  active ? 'bg-accentSoft text-accent' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
