import { Alfa_Slab_One, DM_Sans } from 'next/font/google';

/** Font definitions for The Jacket Club screens (loaded once, reused). */
export const jcDisplay = Alfa_Slab_One({ weight: '400', subsets: ['latin'], variable: '--jc-display' });
export const jcSans = DM_Sans({ subsets: ['latin'], variable: '--jc-sans' });

export const jcFontClass = `${jcDisplay.variable} ${jcSans.variable}`;
