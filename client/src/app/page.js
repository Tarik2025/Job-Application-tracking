'use client';
import Link from 'next/link';
import { FadeIn } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';

const features = [
  { title: 'Kanban Board', desc: 'Drag-and-drop applications across statuses with priority, tags, and contact tracking.' },
  { title: 'Resume Analysis', desc: 'Upload your resume and match against job descriptions. See your score and skill gaps.' },
  { title: 'Interview Prep', desc: 'AI-generated questions tailored to your target role, company, and job description.' },
  { title: 'Email Classification', desc: 'Connect email accounts or paste emails. AI categorizes and updates your pipeline.' },
  { title: 'Status Intelligence', desc: 'AI predicts application status, detects ghosted companies, auto-generates follow-ups.' },
  { title: 'Analytics & Insights', desc: 'Response rates, company performance, salary insights, skills gap analysis.' },
  { title: 'Goals & Streaks', desc: 'Set daily/weekly/monthly application goals. Track your consistency streak.' },
  { title: 'Interview Calendar', desc: 'Schedule interviews, track outcomes, join meetings — all in one place.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 lg:px-12 py-4 max-w-[1100px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="font-semibold text-sm">Career Copilot</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors no-underline">Log in</Link>
          <Link href="/signup" className="px-4 py-2 text-xs bg-[var(--primary)] text-white rounded-lg font-medium no-underline hover:bg-[var(--accent-h)] transition-colors">Sign up</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[650px] mx-auto text-center px-5 pt-16 pb-12">
        <FadeIn>
          <p className="text-xs text-[var(--primary)] font-medium uppercase tracking-wide mb-3">AI-Powered Job Tracking</p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="text-[clamp(26px,5vw,44px)] font-bold leading-[1.15] mb-4">Track, analyze, and land your next role</h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[500px] mx-auto mb-8">
            One place to manage applications, prep for interviews, track streaks, and understand your job search performance.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex gap-3 justify-center">
            <Link href="/signup" className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg no-underline hover:bg-[var(--accent-h)] transition-colors">Get started</Link>
            <Link href="/login" className="px-6 py-2.5 bg-[var(--input)] text-[var(--text)] text-sm font-medium rounded-lg border border-[var(--border)] no-underline hover:border-[var(--primary)] transition-colors">Log in</Link>
          </div>
        </FadeIn>
      </section>

      {/* Stats */}
      <FadeIn delay={0.4}>
        <section className="max-w-[420px] mx-auto px-5 mb-16">
          <div className="grid grid-cols-3 gap-3">
            {[{ n: '24', l: 'Applied' }, { n: '8', l: 'Interviews' }, { n: '3', l: 'Offers' }].map((s, i) => (
              <div key={i} className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl text-center">
                <p className="text-xl font-bold text-[var(--primary)]">{s.n}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Features */}
      <section className="max-w-[900px] mx-auto px-5 pb-16">
        <FadeIn>
          <h2 className="text-xl font-semibold text-center mb-1.5">Everything you need</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-10">Tools that save you hours every week</p>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {features.map((f, i) => (
            <FadeIn key={i} delay={i * 0.04}>
              <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl h-full hover:border-[var(--primary)]/40 transition-colors">
                <h3 className="text-[13px] font-semibold mb-1.5">{f.title}</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[500px] mx-auto px-5 pb-16 text-center">
        <FadeIn>
          <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-xl">
            <h2 className="text-lg font-semibold mb-2">Start tracking today</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">Free to use. Set up in under a minute.</p>
            <Link href="/signup" className="inline-block px-7 py-2.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg no-underline hover:bg-[var(--accent-h)] transition-colors">Create your account</Link>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border)]">
        © 2025 Career Copilot
      </footer>
    </div>
  );
}
