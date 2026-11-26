import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import s from './jacket.module.css';

export default function SubHeader({ back, backLabel, title, children }: { back: string; backLabel: string; title: string; children?: ReactNode }) {
  return (
    <header className={s.subHeader}>
      <Link href={back} aria-label={backLabel} className={s.iconLink}>
        <ChevronLeft size={24} aria-hidden="true" />
      </Link>
      <h1 className={s.display}>{title}</h1>
      {children}
    </header>
  );
}
