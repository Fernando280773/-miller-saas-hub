

\# millerwebdesign1skill.md  
\# Miller Web Design — AI Agent Master Rulebook  
\# Version 1.0 | Business \#1 Priority Build

\---

\#\# AGENT IDENTITY & PRIME DIRECTIVE

You are a senior full-stack web developer and UI/UX designer.  
Your single goal: build the best business website on the internet for Miller Web Design.  
You do not ask unnecessary questions. You follow this file exactly, step by step.  
Every decision you make must serve the goal of making this website \#1.

\---

\#\# SECTION 1 — COLOUR SYSTEM (DO NOT CHANGE)

These are the exact brand colours. Use CSS variables everywhere. Never hardcode hex values in components.

\`\`\`css  
:root {  
  /\* \=== BRAND GRADIENT (the signature look) \=== \*/  
  \--gradient-start:   \#EF178E;  
  \--gradient-mid:     \#8E54E9;  
  \--gradient-end:     \#1CD8D2;  
  \--gradient-bg: linear-gradient(to right bottom, \#EF178E, \#8E54E9, \#1CD8D2);  
  \--gradient-text: linear-gradient(to right, \#EF178E, \#8E54E9);

  /\* \=== PRIMARY PALETTE \=== \*/  
  \--color-primary:      \#EF178E;  
  \--color-secondary:    \#8E54E9;  
  \--color-accent:       \#1CD8D2;  
  \--color-brand-dark:   \#4D578D;

  /\* \=== SURFACES \=== \*/  
  \--color-card-bg:      rgba(255, 255, 255, 0.92);  
  \--color-btn-bg:       rgba(255, 255, 255, 0.95);  
  \--color-btn-border:   rgba(255, 255, 255, 0.60);  
  \--color-surface:      \#FFFFFF;

  /\* \=== TEXT \=== \*/  
  \--color-text-dark:    \#4D578D;  
  \--color-text-white:   \#FFFFFF;  
  \--color-text-muted:   rgba(255, 255, 255, 0.88);  
  \--color-text-subtle:  \#B9BDC0;  
  \--color-text-body:    \#3D4461;

  /\* \=== BORDERS \=== \*/  
  \--color-border:       \#DADADA;  
  \--color-border-light: rgba(255, 255, 255, 0.20);

  /\* \=== ERROR / ALERT \=== \*/  
  \--color-error:        \#D9368B;  
  \--color-error-border: \#F1B7D5;  
  \--color-error-bg:     \#FDF8FA;

  /\* \=== SUCCESS \=== \*/  
  \--color-success:      \#1CD8D2;  
  \--color-success-bg:   rgba(28, 216, 210, 0.1);

  /\* \=== DARK MODE SURFACES \=== \*/  
  \--color-dark-card:    rgba(30, 28, 48, 0.92);  
  \--color-dark-base:    \#141413;  
  \--color-dark-surface: \#1E1C30;

  /\* \=== SPACING SCALE \=== \*/  
  \--space-1: 4px;  
  \--space-2: 8px;  
  \--space-3: 12px;  
  \--space-4: 16px;  
  \--space-5: 24px;  
  \--space-6: 32px;  
  \--space-7: 48px;  
  \--space-8: 56px;  
  \--space-9: 80px;  
  \--space-10: 120px;

  /\* \=== BORDER RADIUS \=== \*/  
  \--radius-sm:   6px;  
  \--radius-md:   12px;  
  \--radius-lg:   22px;  
  \--radius-full: 999px;

  /\* \=== SHADOWS \=== \*/  
  \--shadow-card: 0 8px 32px rgba(142, 84, 233, 0.15);  
  \--shadow-btn:  0 4px 16px rgba(239, 23, 142, 0.3);  
  \--shadow-hover: 0 12px 40px rgba(142, 84, 233, 0.25);

  /\* \=== ANIMATION \=== \*/  
  \--anim-duration: 0.44s;  
  \--anim-fast:     0.2s;  
  \--anim-easing:   cubic-bezier(0.4, 0, 0.2, 1);  
  \--anim-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1);

  /\* \=== TYPOGRAPHY \=== \*/  
  \--font-primary: 'Poppins', sans-serif;  
  \--font-mono:    'JetBrains Mono', monospace;

  /\* \=== Z-INDEX SCALE \=== \*/  
  \--z-base:    1;  
  \--z-card:    10;  
  \--z-nav:     100;  
  \--z-modal:   1000;  
  \--z-toast:   2000;  
  \--z-skip:    9999;  
}  
\`\`\`

\#\#\# Dark Mode Override (add to same CSS file)  
\`\`\`css  
@media (prefers-color-scheme: dark) {  
  :root {  
    \--color-card-bg:    rgba(30, 28, 48, 0.92);  
    \--color-surface:    \#1E1C30;  
    \--color-text-dark:  \#E8EAFF;  
    \--color-text-body:  rgba(232, 234, 255, 0.85);  
    \--color-border:     rgba(255, 255, 255, 0.12);  
    \--color-btn-bg:     rgba(255, 255, 255, 0.08);  
    \--color-btn-border: rgba(255, 255, 255, 0.15);  
  }  
}  
\`\`\`

\---

\#\# SECTION 2 — TECH STACK (USE EXACTLY THESE TOOLS)

\#\#\# Frontend Framework  
\- \*\*Angular 18+\*\* (standalone components, no NgModules)  
\- \*\*Angular CLI\*\* with \*\*esbuild\*\* builder (NOT webpack)  
\- \*\*Angular Router\*\* for client-side navigation  
\- \*\*Angular Animations\*\* for transitions

\#\#\# Styling  
\- \*\*Pure custom CSS\*\* — NO Tailwind, NO Bootstrap, NO Material  
\- BEM naming convention with \`mwd-\` prefix (Miller Web Design)  
\- CSS custom properties from Section 1 everywhere  
\- Component-scoped styles via Angular \`ViewEncapsulation.Emulated\`

\#\#\# UI Enhancements  
\- \*\*SweetAlert2\*\* — modals, toasts, confirmations  
\- \*\*Poppins\*\* font via Google Fonts (weights: 300, 400, 500, 600, 700\)  
\- \*\*JetBrains Mono\*\* for code snippets / tech sections  
\- Custom SVG icons (no icon libraries — keeps bundle lean)

\#\#\# Backend / Auth  
\- \*\*AWS Amplify v6\*\* — auth \+ API client  
\- \*\*AWS Cognito\*\* — user pool with custom domain  
\- \*\*OAuth 2.0 \+ PKCE\*\* — \`response\_type=code\`, \`code\_challenge\_method=S256\`  
\- \*\*OpenID Connect\*\* — \`scope=openid email profile\`  
\- \*\*Google reCAPTCHA v3\*\* — on contact forms

\#\#\# Forms & Validation  
\- \*\*Angular Reactive Forms\*\* — \`FormBuilder\`, \`Validators\`  
\- Custom validator functions (no third-party form libraries)

\#\#\# Hosting & Delivery  
\- \*\*AWS Amplify Hosting\*\* or \*\*Vercel\*\* — both support Angular SSG/SSR  
\- \*\*CloudFront CDN\*\* — assets served globally  
\- \*\*HTTP/3 (QUIC)\*\* — ensure hosting supports it  
\- \*\*Runtime config\*\* via \`assets/environment/app-config.json\`

\#\#\# Development Tools  
\- \*\*Node.js 20 LTS\*\*  
\- \*\*Angular CLI 18+\*\* (\`npm install \-g @angular/cli\`)  
\- \*\*TypeScript 5.4+\*\*  
\- \*\*ESLint \+ Prettier\*\* for code quality  
\- \*\*Husky\*\* pre-commit hooks

\---

\#\# SECTION 3 — STEP-BY-STEP BUILD ORDER

Follow this exact sequence. Do not skip steps. Do not reorder.

\#\#\# PHASE 1 — PROJECT SETUP (Day 1\)

\*\*Step 1.1 — Create Angular project\*\*  
\`\`\`bash  
ng new miller-web-design \\  
  \--style=css \\  
  \--routing=true \\  
  \--standalone=true \\  
  \--ssr=false  
cd miller-web-design  
\`\`\`

\*\*Step 1.2 — Install all dependencies\*\*  
\`\`\`bash  
npm install sweetalert2  
npm install aws-amplify  
npm install @aws-amplify/ui-angular  
npm install \--save-dev eslint prettier husky lint-staged  
\`\`\`

\*\*Step 1.3 — Set up Google Fonts in \`index.html\`\*\*  
\`\`\`html  
\<head\>  
  \<meta charset="utf-8"\>  
  \<title\>Miller Web Design — \#1 Web Design Agency\</title\>  
  \<meta name="viewport" content="width=device-width, initial-scale=1"\>  
  \<meta name="description" content="Miller Web Design builds world-class websites that dominate search, convert visitors, and grow your business."\>  
  \<meta name="theme-color" content="\#8E54E9"\>  
  \<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin\>  
  \<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800\&family=JetBrains+Mono:wght@400;500\&display=swap" rel="stylesheet"\>  
  \<link rel="icon" type="image/svg+xml" href="/favicon.svg"\>  
  \<\!-- Skip link (first element in body) \--\>  
\</head\>  
\<body\>  
  \<a href="\#main-content" class="mwd-skip-link"\>Skip to main content\</a\>  
  \<app-root\>\</app-root\>  
\</body\>  
\`\`\`

\*\*Step 1.4 — Paste Section 1 CSS into \`src/styles.css\`\*\*  
Add all \`:root\` variables, dark mode overrides, and the following global resets:  
\`\`\`css  
\*, \*::before, \*::after { box-sizing: border-box; margin: 0; padding: 0; }  
html { scroll-behavior: smooth; }  
body {  
  font-family: var(--font-primary);  
  color: var(--color-text-body);  
  background: var(--color-dark-base);  
  \-webkit-font-smoothing: antialiased;  
  \-moz-osx-font-smoothing: grayscale;  
}  
img, svg { display: block; max-width: 100%; }  
a { color: inherit; text-decoration: none; }

/\* Skip link \*/  
.mwd-skip-link {  
  position: absolute;  
  top: \-100%;  
  left: 1rem;  
  z-index: var(--z-skip);  
  padding: 8px 16px;  
  background: var(--color-surface);  
  color: var(--color-brand-dark);  
  font-size: 14px;  
  font-weight: 500;  
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);  
  transition: top var(--anim-fast);  
}  
.mwd-skip-link:focus { top: 0; outline: 2px solid var(--color-accent); }

/\* Gradient text utility \*/  
.mwd-gradient-text {  
  background: var(--gradient-text);  
  \-webkit-background-clip: text;  
  \-webkit-text-fill-color: transparent;  
  background-clip: text;  
}

/\* Gradient background utility \*/  
.mwd-gradient-bg { background: var(--gradient-bg); }

/\* Glass card utility \*/  
.mwd-glass {  
  background: var(--color-card-bg);  
  backdrop-filter: blur(16px);  
  \-webkit-backdrop-filter: blur(16px);  
  border: 1px solid var(--color-btn-border);  
  border-radius: var(--radius-lg);  
  box-shadow: var(--shadow-card);  
}

/\* Visually hidden (screen reader only) \*/  
.mwd-sr-only {  
  position: absolute; width: 1px; height: 1px;  
  padding: 0; margin: \-1px; overflow: hidden;  
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;  
}  
\`\`\`

\*\*Step 1.5 — Generate all route components\*\*  
\`\`\`bash  
ng g c pages/home      \--standalone \--style=css  
ng g c pages/about     \--standalone \--style=css  
ng g c pages/services  \--standalone \--style=css  
ng g c pages/portfolio \--standalone \--style=css  
ng g c pages/contact   \--standalone \--style=css  
ng g c pages/blog      \--standalone \--style=css  
ng g c shared/navbar   \--standalone \--style=css  
ng g c shared/footer   \--standalone \--style=css  
ng g c shared/hero     \--standalone \--style=css  
ng g c shared/card     \--standalone \--style=css  
ng g c shared/btn      \--standalone \--style=css  
\`\`\`

\*\*Step 1.6 — Set up routes in \`app.routes.ts\`\*\*  
\`\`\`typescript  
export const routes: Routes \= \[  
  { path: '', loadComponent: () \=\> import('./pages/home/home.component').then(m \=\> m.HomeComponent) },  
  { path: 'about', loadComponent: () \=\> import('./pages/about/about.component').then(m \=\> m.AboutComponent) },  
  { path: 'services', loadComponent: () \=\> import('./pages/services/services.component').then(m \=\> m.ServicesComponent) },  
  { path: 'portfolio', loadComponent: () \=\> import('./pages/portfolio/portfolio.component').then(m \=\> m.PortfolioComponent) },  
  { path: 'contact', loadComponent: () \=\> import('./pages/contact/contact.component').then(m \=\> m.ContactComponent) },  
  { path: 'blog', loadComponent: () \=\> import('./pages/blog/blog.component').then(m \=\> m.BlogComponent) },  
  { path: '\*\*', redirectTo: '' }  
\];  
\`\`\`

\---

\#\#\# PHASE 2 — SHARED COMPONENTS (Day 2\)

\*\*Step 2.1 — Build Navbar component\*\*

Rules:  
\- Fixed top, \`z-index: var(--z-nav)\`  
\- Transparent on load, \`rgba(255,255,255,0.95)\` \+ \`backdrop-filter: blur(16px)\` on scroll  
\- Logo: "Miller" in gradient text \+ "Web Design" in \`var(--color-brand-dark)\`  
\- Nav links: \`var(--color-brand-dark)\`, hover colour \`var(--color-primary)\`  
\- CTA button: gradient background, white text, \`var(--radius-full)\` pill shape  
\- Mobile: hamburger at \`\< 768px\`, slide-in drawer with same glass effect  
\- \`role="navigation"\` \+ \`aria-label="Main navigation"\`  
\- Active route link gets \`aria-current="page"\`

\*\*Step 2.2 — Build Footer component\*\*

Rules:  
\- Background: \`var(--color-dark-surface)\` (\`\#1E1C30\`)  
\- Three-column grid: Brand \+ tagline | Links | Contact info  
\- Brand logo same treatment as navbar  
\- Social icons: SVG only, \`aria-label\` on each link  
\- Copyright line: \`var(--color-text-subtle)\` at 13px  
\- \`role="contentinfo"\`

\*\*Step 2.3 — Build Button component (\`\<mwd-btn\>\`)\*\*

Rules:  
\`\`\`typescript  
@Input() variant: 'primary' | 'secondary' | 'ghost' | 'white' \= 'primary';  
@Input() size: 'sm' | 'md' | 'lg' \= 'md';  
@Input() loading: boolean \= false;  
@Input() disabled: boolean \= false;  
@Input() ariaLabel: string \= '';  
\`\`\`

CSS for each variant:  
\`\`\`css  
/\* Primary — gradient \*/  
.mwd-btn--primary {  
  background: var(--gradient-bg);  
  color: var(--color-text-white);  
  border: none;  
  box-shadow: var(--shadow-btn);  
}  
.mwd-btn--primary:hover { box-shadow: var(--shadow-hover); transform: translateY(-1px); }

/\* Secondary — outline \*/  
.mwd-btn--secondary {  
  background: transparent;  
  color: var(--color-primary);  
  border: 2px solid var(--color-primary);  
}

/\* Ghost — glass \*/  
.mwd-btn--ghost {  
  background: var(--color-btn-bg);  
  color: var(--color-brand-dark);  
  border: 1px solid var(--color-btn-border);  
}

/\* White — on gradient backgrounds \*/  
.mwd-btn--white {  
  background: rgba(255,255,255,0.95);  
  color: var(--color-brand-dark);  
  border: 1px solid rgba(255,255,255,0.6);  
}

/\* Sizes \*/  
.mwd-btn--sm { padding: 6px 16px; font-size: 13px; border-radius: var(--radius-full); }  
.mwd-btn--md { padding: 12px 28px; font-size: 15px; border-radius: var(--radius-full); }  
.mwd-btn--lg { padding: 16px 40px; font-size: 16px; border-radius: var(--radius-full); }

/\* Shared \*/  
.mwd-btn {  
  font-family: var(--font-primary);  
  font-weight: 600;  
  cursor: pointer;  
  transition: all var(--anim-fast) var(--anim-easing);  
  display: inline-flex; align-items: center; gap: 8px;  
}  
.mwd-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }  
.mwd-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }  
\`\`\`

\---

\#\#\# PHASE 3 — PAGE BUILDS (Days 3–7)

\#\#\#\# HOME PAGE (most important — build first)

\*\*Step 3.1 — Hero Section\*\*

Layout: full-viewport-height, gradient background, wave SVG decoration, two-column grid.

Left column:  
\- Badge pill: \`"\#1 Web Design Agency"\` — white glass pill, gradient left border  
\- H1: large headline (48px desktop / 32px mobile), bold, white  
\- Subtext: \`rgba(255,255,255,0.88)\`, 18px, 28px line-height  
\- Two CTA buttons: primary ("Get Started") \+ ghost ("View Our Work")  
\- Trust badges: "50+ clients" / "100% satisfaction" / "5-star rated" — small white pills

Right column:  
\- Floating glassmorphism card showing a mock website preview or dashboard  
\- Animated gradient border on the card  
\- Small floating stat cards (e.g. "+320% traffic") using \`var(--anim-bounce)\`

Rules:  
\- \`aria-label\` on hero section: \`"Miller Web Design — Hero"\`  
\- H1 is the single \`\<h1\>\` on the page  
\- All decorative SVGs have \`aria-hidden="true"\`

\*\*Step 3.2 — Services Section\*\*

Layout: 3-column card grid on desktop, 1-column on mobile.

Service cards (glassmorphism \`.mwd-glass\`):  
\- Icon: custom SVG in gradient colour  
\- H3 title: \`var(--color-brand-dark)\`, 20px, 600 weight  
\- Description: \`var(--color-text-body)\`, 15px  
\- "Learn more →" link: \`var(--color-primary)\`, hover underline  
\- Hover: \`transform: translateY(-4px)\`, \`box-shadow: var(--shadow-hover)\`

Services to include:  
1\. Web Design  
2\. Web Development  
3\. SEO & Performance  
4\. Brand Identity  
5\. E-Commerce  
6\. Maintenance & Support

\*\*Step 3.3 — Portfolio / Work Section\*\*

Layout: masonry or 2x3 grid. Each item:  
\- Full-bleed image with overlay on hover  
\- Overlay: gradient background at 0.85 opacity  
\- Title \+ category tag in white  
\- "View Project →" button (white ghost variant)  
\- Image alt text: descriptive, not "image1.jpg"

\*\*Step 3.4 — Social Proof / Testimonials\*\*

Layout: horizontal scroll on mobile, 3-column grid on desktop.

Each testimonial card:  
\- Glass card with subtle gradient top border  
\- Quote text: \`var(--color-text-body)\`, italic, 16px  
\- Author name: \`var(--color-brand-dark)\`, 600 weight  
\- Role \+ company: \`var(--color-text-subtle)\`, 13px  
\- Star rating: gradient-coloured SVG stars (not emoji)

\*\*Step 3.5 — Stats / Numbers Section\*\*

Background: gradient (\`var(--gradient-bg)\`), wave borders top and bottom.

4 large numbers:  
\- Number: 64px, 700 weight, white, count-up animation on scroll  
\- Label: 16px, \`rgba(255,255,255,0.88)\`  
\- Use \`IntersectionObserver\` to trigger count-up once in view

\*\*Step 3.6 — CTA Banner Section\*\*

Full-width gradient section:  
\- H2: white, 40px  
\- Subtext: muted white  
\- Primary CTA button (white variant)  
\- Background: wave SVG \+ gradient

\*\*Step 3.7 — Blog Preview Section\*\*

3 latest posts, card grid. Each card:  
\- Category tag: gradient background pill  
\- Title: \`var(--color-brand-dark)\`, 18px, 600 weight  
\- Excerpt: \`var(--color-text-body)\`, 14px, 3-line clamp  
\- "Read more →" link: \`var(--color-primary)\`  
\- Date: \`var(--color-text-subtle)\`, 12px

\#\#\#\# ABOUT PAGE

Sections: Hero intro | Team cards | Mission/Values | Tech stack badges | CTA

Team card rules:  
\- Photo with gradient ring border  
\- Name: H3, \`var(--color-brand-dark)\`  
\- Role: gradient text  
\- Bio: \`var(--color-text-body)\`, 14px

\#\#\#\# SERVICES PAGE

Dedicated page per service (use Angular Router child routes):  
\- Detailed description, process steps, pricing, FAQ accordion, CTA

\#\#\#\# PORTFOLIO PAGE

Full project gallery with filter tabs:  
\- Filter buttons: gradient border when active, ghost when inactive  
\- Each project: full case study layout when clicked

\#\#\#\# CONTACT PAGE

Form fields (follow Section 4 rules exactly):  
\- Name, Email, Phone (optional), Service needed (select), Message, Budget range (select)  
\- Submit button: primary gradient  
\- SweetAlert2 success/error toasts

\#\#\#\# BLOG PAGE

Article list with pagination. Each article page:  
\- Reading time estimate  
\- Progress bar on scroll (gradient)  
\- Table of contents (sticky sidebar on desktop)

\---

\#\#\# PHASE 4 — ACCESSIBILITY BUILD (Day 8\) — NON-NEGOTIABLE

Complete every item. Do not skip.

\*\*Step 4.1 — Landmark roles on every page\*\*  
\`\`\`html  
\<header role="banner"\>          \<\!-- navbar \--\>  
\<main id="main-content"\>        \<\!-- page content \--\>  
\<footer role="contentinfo"\>     \<\!-- footer \--\>  
\<nav role="navigation" aria-label="Main navigation"\>  
\<aside role="complementary"\>    \<\!-- sidebars \--\>  
\`\`\`

\*\*Step 4.2 — Heading hierarchy (strict — enforce with ESLint rule)\*\*  
\- One \`\<h1\>\` per page only (always the hero headline)  
\- Section titles → \`\<h2\>\`  
\- Card titles → \`\<h3\>\`  
\- Sub-items → \`\<h4\>\`  
\- Never skip levels

\*\*Step 4.3 — Every interactive element must have:\*\*  
\- \`aria-label\` if text content is ambiguous  
\- \`:focus-visible\` style (2px \`var(--color-accent)\` outline, 2-3px offset)  
\- Minimum touch target: 44x44px  
\- Tab order follows visual order

\*\*Step 4.4 — Every image must have:\*\*  
\- Descriptive \`alt\` text (not "image" or filename)  
\- Decorative images: \`alt=""\` \+ \`aria-hidden="true"\`  
\- \`width\` \+ \`height\` attributes to prevent layout shift

\*\*Step 4.5 — Contrast ratios (WCAG AA minimum)\*\*  
\- Normal text (\< 18px): 4.5:1 minimum  
\- Large text (≥ 18px bold or ≥ 24px): 3:1 minimum  
\- Check: \`var(--color-text-body)\` (\#3D4461) on white \= 7.2:1 ✅  
\- Check: white on \`var(--color-primary)\` (\#EF178E) \= 4.6:1 ✅  
\- Fix label text: use \`var(--color-brand-dark)\` (\#4D578D) not \#646C9A

\*\*Step 4.6 — Forms (every form field)\*\*  
\`\`\`html  
\<label for="fieldId"\>Field Name\</label\>  
\<input id="fieldId"  
       type="email"  
       autocomplete="email"  
       inputmode="email"  
       spellcheck="false"  
       autocapitalize="off"  
       required  
       aria-required="true"  
       aria-describedby="fieldId-error"  
       placeholder="name@company.com"\>  
\<span id="fieldId-error" class="mwd-sr-only" role="alert" aria-live="polite"\>\</span\>  
\`\`\`

\*\*Step 4.7 — Dynamic content announcements\*\*  
\`\`\`html  
\<div aria-live="polite" aria-atomic="true" class="mwd-sr-only" id="mwd-announcer"\>\</div\>  
\`\`\`  
Inject into \`AppComponent\`. Use to announce: page transitions, form success/error, count-up completions.

\*\*Step 4.8 — Reduced motion respect\*\*  
\`\`\`css  
@media (prefers-reduced-motion: reduce) {  
  \*, \*::before, \*::after {  
    animation-duration: 0.01ms \!important;  
    animation-iteration-count: 1 \!important;  
    transition-duration: 0.01ms \!important;  
    scroll-behavior: auto \!important;  
  }  
}  
\`\`\`

\---

\#\#\# PHASE 5 — PERFORMANCE BUILD (Day 9\)

\*\*Step 5.1 — Image optimisation rules\*\*  
\- All images: WebP format  
\- Use \`\<img loading="lazy"\>\` on everything below the fold  
\- Hero image: \`loading="eager"\` \+ \`fetchpriority="high"\`  
\- Always include \`width\` and \`height\` attributes  
\- Use \`srcset\` for responsive images

\*\*Step 5.2 — Angular build optimisation\*\*  
\`\`\`json  
// angular.json — production build config  
{  
  "optimization": true,  
  "outputHashing": "all",  
  "sourceMap": false,  
  "namedChunks": false,  
  "aot": true,  
  "buildOptimizer": true,  
  "budgets": \[  
    { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },  
    { "type": "anyComponentStyle", "maximumWarning": "4kb" }  
  \]  
}  
\`\`\`

\*\*Step 5.3 — Lazy loading rules\*\*  
\- Every route: \`loadComponent()\` (already set in Phase 1\)  
\- Every heavy library (SweetAlert2): dynamic import  
\`\`\`typescript  
const Swal \= (await import('sweetalert2')).default;  
\`\`\`

\*\*Step 5.4 — Critical CSS\*\*  
Install and configure Beasties (Angular's built-in critical CSS inliner):  
\`\`\`json  
// angular.json  
"extractLicenses": true,  
"inlineStyleLanguage": "css"  
\`\`\`

\*\*Step 5.5 — Core Web Vitals targets\*\*  
\- LCP (Largest Contentful Paint): \< 2.5s  
\- FID / INP: \< 100ms  
\- CLS (Cumulative Layout Shift): \< 0.1  
\- Always set image dimensions, use \`font-display: swap\` for fonts

\---

\#\#\# PHASE 6 — SEO BUILD (Day 10\)

\*\*Step 6.1 — Angular Meta service (add to every page component)\*\*  
\`\`\`typescript  
import { Meta, Title } from '@angular/platform-browser';

constructor(private meta: Meta, private title: Title) {  
  this.title.setTitle('Miller Web Design — \#1 Web Design Agency');  
  this.meta.updateTag({ name: 'description', content: '...' });  
  this.meta.updateTag({ property: 'og:title', content: '...' });  
  this.meta.updateTag({ property: 'og:image', content: '/assets/og-image.jpg' });  
  this.meta.updateTag({ name: 'twitter:card', content: 'summary\_large\_image' });  
}  
\`\`\`

\*\*Step 6.2 — Structured Data (JSON-LD)\*\*  
Add to \`index.html\`:  
\`\`\`html  
\<script type="application/ld+json"\>  
{  
  "@context": "https://schema.org",  
  "@type": "LocalBusiness",  
  "name": "Miller Web Design",  
  "description": "Professional web design and development agency",  
  "url": "https://millerwebdesign.com",  
  "@type": "WebDesign",  
  "areaServed": "Worldwide",  
  "aggregateRating": {  
    "@type": "AggregateRating",  
    "ratingValue": "5.0",  
    "reviewCount": "50"  
  }  
}  
\</script\>  
\`\`\`

\*\*Step 6.3 — \`robots.txt\`\*\*  
\`\`\`  
User-agent: \*  
Allow: /  
Sitemap: https://millerwebdesign.com/sitemap.xml  
\`\`\`

\*\*Step 6.4 — \`sitemap.xml\`\*\* (generate automatically on build)  
Use \`@anatine/esbuild-decorators\` or a custom Angular schematic to auto-generate.

\---

\#\#\# PHASE 7 — DARK MODE (Day 11\)

Dark mode applies only to surfaces inside components — NOT to the gradient background, which always remains vibrant.

\*\*Rule:\*\* Every component that has a white/light surface must have a dark mode equivalent using the CSS variables already defined in Section 1\.

\`\`\`css  
/\* In component CSS — example: card \*/  
.mwd-card {  
  background: var(--color-card-bg);     /\* auto-switches via CSS vars \*/  
  border-color: var(--color-border);    /\* auto-switches via CSS vars \*/  
  color: var(--color-text-dark);        /\* auto-switches via CSS vars \*/  
}  
/\* No extra @media needed — vars handle it \*/  
\`\`\`

Additional component-specific dark overrides in \`styles.css\`:  
\`\`\`css  
@media (prefers-color-scheme: dark) {  
  .mwd-navbar { background: rgba(20, 18, 40, 0.95); }  
  .mwd-footer { background: \#0D0B1A; }  
  input, select, textarea {  
    background: rgba(255,255,255,0.07);  
    border-color: rgba(255,255,255,0.15);  
    color: \#ffffff;  
  }  
  input::placeholder { color: rgba(255,255,255,0.35); }  
}  
\`\`\`

\---

\#\#\# PHASE 8 — TESTING & QA (Day 12\)

\*\*Step 8.1 — Accessibility audit\*\*  
\`\`\`bash  
npm install \-g @axe-core/cli  
axe http://localhost:4200 \--exit  
\`\`\`  
Target: 0 critical violations, 0 serious violations.

\*\*Step 8.2 — Lighthouse CI\*\*  
\`\`\`bash  
npm install \-g lighthouse  
lighthouse http://localhost:4200 \--output=html \--output-path=./lighthouse-report.html  
\`\`\`  
Targets: Performance ≥ 95 | Accessibility \= 100 | Best Practices \= 100 | SEO \= 100

\*\*Step 8.3 — Cross-browser testing matrix\*\*  
\- Chrome (latest)  
\- Firefox (latest)  
\- Safari (latest)  
\- Edge (latest)  
\- iOS Safari 15+  
\- Android Chrome

\*\*Step 8.4 — Device testing\*\*  
\- 320px (smallest phone)  
\- 375px (iPhone SE)  
\- 768px (tablet)  
\- 1024px (laptop)  
\- 1440px (desktop)  
\- 1920px (large desktop)

\---

\#\#\# PHASE 9 — DEPLOYMENT (Day 13\)

\*\*Step 9.1 — Build for production\*\*  
\`\`\`bash  
ng build \--configuration=production  
\`\`\`

\*\*Step 9.2 — Deploy to AWS Amplify\*\*  
\`\`\`bash  
npm install \-g @aws-amplify/cli  
amplify init  
amplify add hosting  
amplify publish  
\`\`\`

OR deploy to Vercel:  
\`\`\`bash  
npm install \-g vercel  
vercel \--prod  
\`\`\`

\*\*Step 9.3 — Environment config\*\*  
Create \`src/assets/environment/app-config.json\`:  
\`\`\`json  
{  
  "name": "production",  
  "production": true,  
  "apiEndpoint": "https://api.millerwebdesign.com",  
  "recaptchaSiteKey": "YOUR\_KEY\_HERE",  
  "features": {  
    "blog": true,  
    "portfolio": true,  
    "darkMode": true  
  }  
}  
\`\`\`

\*\*Step 9.4 — Post-deploy checklist\*\*  
\- \[ \] SSL certificate active (HTTPS only)  
\- \[ \] HTTP → HTTPS redirect configured  
\- \[ \] \`www\` → non-www redirect (or vice versa, pick one)  
\- \[ \] 404 page created and styled  
\- \[ \] Contact form sending emails  
\- \[ \] Analytics configured (GA4 or Plausible)  
\- \[ \] Sitemap submitted to Google Search Console

\---

\#\# SECTION 4 — FORM RULES (EVERY FORM — NO EXCEPTIONS)

Every single form input must follow these rules:

\`\`\`html  
\<\!-- Template \--\>  
\<div class="mwd-field"\>  
  \<label class="mwd-label" for="INPUT\_ID"\>  
    Label Text \<span aria-hidden="true" class="mwd-label\_\_required"\>\*\</span\>  
  \</label\>  
  \<input  
    class="mwd-input"  
    id="INPUT\_ID"  
    \[type\]="appropriate-type"  
    \[formControlName\]="controlName"  
    \[autocomplete\]="appropriate-value"  
    \[placeholder\]="helpful-example"  
    \[attr.aria-invalid\]="field.invalid && field.touched ? 'true' : null"  
    \[attr.aria-describedby\]="field.invalid && field.touched ? 'INPUT\_ID-error' : null"  
    required  
    aria-required="true"\>  
  \<span  
    class="mwd-field\_\_error"  
    id="INPUT\_ID-error"  
    role="alert"  
    \*ngIf="field.invalid && field.touched"\>  
    {{ getErrorMessage(field) }}  
  \</span\>  
\</div\>  
\`\`\`

\`\`\`css  
/\* Field styles \*/  
.mwd-field { display: flex; flex-direction: column; gap: var(--space-2); }

.mwd-label {  
  font-size: 13px;  
  font-weight: 600;  
  color: var(--color-brand-dark);       /\* NOT \#646C9A — contrast fix \*/  
  letter-spacing: 0.5px;  
  text-transform: uppercase;  
}

.mwd-label\_\_required { color: var(--color-error); margin-left: 2px; }

.mwd-input {  
  width: 100%;  
  padding: 12px 16px;  
  font-size: 15px;  
  font-family: var(--font-primary);  
  color: var(--color-text-dark);  
  background: var(--color-surface);  
  border: 1.5px solid var(--color-border);  
  border-radius: var(--radius-sm);  
  transition: border-color var(--anim-fast) var(--anim-easing),  
              box-shadow var(--anim-fast) var(--anim-easing);  
}

.mwd-input::placeholder { color: var(--color-text-subtle); }

.mwd-input:focus {  
  outline: none;  
  border-color: var(--color-accent);  
  box-shadow: 0 0 0 3px rgba(28, 216, 210, 0.15);  
}

.mwd-input\[aria-invalid="true"\] {  
  border-color: var(--color-error);  
  box-shadow: 0 0 0 3px rgba(217, 54, 139, 0.12);  
}

.mwd-field\_\_error {  
  font-size: 12px;  
  font-weight: 500;  
  color: var(--color-error);  
}  
\`\`\`

\---

\#\# SECTION 5 — COMPONENT PATTERNS (REUSE THESE)

\#\#\# Glass Card  
\`\`\`html  
\<div class="mwd-glass mwd-card"\>  
  \<ng-content\>\</ng-content\>  
\</div\>  
\`\`\`  
\`\`\`css  
.mwd-card { padding: var(--space-6); transition: transform var(--anim-fast) var(--anim-easing), box-shadow var(--anim-fast) var(--anim-easing); }  
.mwd-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }  
\`\`\`

\#\#\# Section Wrapper  
\`\`\`html  
\<section class="mwd-section" \[attr.aria-labelledby\]="headingId"\>  
  \<div class="mwd-container"\>  
    \<ng-content\>\</ng-content\>  
  \</div\>  
\</section\>  
\`\`\`  
\`\`\`css  
.mwd-section { padding: var(--space-10) 0; }  
.mwd-container { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-6); }  
\`\`\`

\#\#\# Section Heading  
\`\`\`html  
\<div class="mwd-section-header"\>  
  \<span class="mwd-section-badge"\>Our Services\</span\>  
  \<h2 class="mwd-section-title" id="services-heading"\>  
    What We \<span class="mwd-gradient-text"\>Build\</span\>  
  \</h2\>  
  \<p class="mwd-section-subtitle"\>Description text here.\</p\>  
\</div\>  
\`\`\`  
\`\`\`css  
.mwd-section-header { text-align: center; margin-bottom: var(--space-9); }  
.mwd-section-badge {  
  display: inline-block; padding: 6px 16px;  
  background: rgba(239,23,142,0.1); color: var(--color-primary);  
  border-radius: var(--radius-full); font-size: 13px; font-weight: 600;  
  margin-bottom: var(--space-4);  
}  
.mwd-section-title { font-size: clamp(28px, 5vw, 48px); font-weight: 700; color: var(--color-brand-dark); margin-bottom: var(--space-4); }  
.mwd-section-subtitle { font-size: 18px; color: var(--color-text-body); max-width: 600px; margin: 0 auto; }  
\`\`\`

\#\#\# Gradient Border Card  
\`\`\`css  
.mwd-card--gradient-border {  
  position: relative;  
  background: var(--color-card-bg);  
  border-radius: var(--radius-lg);  
}  
.mwd-card--gradient-border::before {  
  content: '';  
  position: absolute;  
  inset: 0;  
  border-radius: inherit;  
  padding: 2px;  
  background: var(--gradient-bg);  
  \-webkit-mask: linear-gradient(\#fff 0 0\) content-box, linear-gradient(\#fff 0 0);  
  mask: linear-gradient(\#fff 0 0\) content-box, linear-gradient(\#fff 0 0);  
  \-webkit-mask-

