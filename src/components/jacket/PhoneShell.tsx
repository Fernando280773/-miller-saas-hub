import type { ReactNode } from 'react';
import { jcFontClass } from '@/lib/jacketFonts';
import s from './jacket.module.css';

/** Centred phone-width column used by the customer app and driver view. */
export default function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${s.theme} ${s.shell} ${jcFontClass}`}>
      <div className={s.phone}>{children}</div>
    </div>
  );
}
