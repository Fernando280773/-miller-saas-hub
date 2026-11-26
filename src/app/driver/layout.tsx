import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import PhoneShell from '@/components/jacket/PhoneShell';

export const metadata: Metadata = { title: 'The Jacket Club · Driver' };

export default function DriverLayout({ children }: { children: ReactNode }) {
  return <PhoneShell>{children}</PhoneShell>;
}
