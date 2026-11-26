import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import PhoneShell from '@/components/jacket/PhoneShell';

export const metadata: Metadata = {
  title: 'The Jacket Club · Order',
  description: 'Order jackets, smash burgers and wraps to collect, at your table or delivered — or book a table.',
};

export default function OrderLayout({ children }: { children: ReactNode }) {
  return <PhoneShell>{children}</PhoneShell>;
}
