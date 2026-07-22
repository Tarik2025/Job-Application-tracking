'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Briefcase, BarChart2, Mail, FileText, Zap, Shield, ArrowRight, CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ROUTES } from '@/constants';

const features = [
  { icon: <Briefcase size={20} />, title: 'Kanban Board', desc: 'Visualize your pipeline from applied to offer in one drag-and-drop board.' },
  { icon: <Mail size={20} />, title: 'Email Classifier', desc: 'Auto-classify recruiter emails — rejections, interviews, offers — with AI.' },
  { icon: <FileText size={20} />, title: 'Resume Matcher', desc: 'Score your resume against any job description and get gap analysis.' },
  { icon: <BarChart2 size={20} />, title: 'Analytics', desc: 'Track response rates, interview conversion, and weekly application streaks.' },
  { icon: <Zap size={20} />, title: 'Interview Prep', desc: 'Generate role-specific interview questions and answers powered by Gemini.' },
  { icon: <Shield size={20} />, title: 'Secure & Private', desc: 'Your data stays yours. JWT auth, CSRF protection, and encrypted storage.' },
];

const highlights = [
  'Track unlimited job applications',
  'AI-powered email classification',
  'Resume vs JD match scoring',
  'Interview question generator',
  'Daily streak & goal tracking',
  'Chrome extension for 1-click saves',
];

function LandingContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="font-bold text-[var(--text)]">Career Copilot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={ROUTES.LOGIN} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              Sign in
            </Link>
            <Link
              href={ROUTES.SIGNUP}
              className="text-sm font-medium px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--accent-h)] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 mb-6">
              <Zap size={11} /> AI-Powered Job Tracker
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text)] leading-tight mb-5">
              Land your next job,{' '}
              <span className="text-[var(--primary)]">faster</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              Track every application, classify recruiter emails, match your resume to job descriptions, and prep for interviews — all in one place.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href={ROUTES.SIGNUP}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--accent-h)] transition-colors shadow-lg shadow-[var(--primary)]/25"
              >
                Start for free <ArrowRight size={15} />
              </Link>
              <Link
                href={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium hover:bg-[var(--input)] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Highlights */}
      <section className="pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <CheckCircle size={14} className="text-[var(--success)] shrink-0" />
                {item}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Everything you need</h2>
            <p className="text-[var(--text-secondary)]">Built for serious job seekers who want an edge.</p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-1">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[var(--border)]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-3">Ready to take control?</h2>
          <p className="text-[var(--text-secondary)] mb-7">Join job seekers who track smarter, not harder.</p>
          <Link
            href={ROUTES.SIGNUP}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--accent-h)] transition-colors shadow-lg shadow-[var(--primary)]/25"
          >
            Create free account <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 px-6 text-center text-xs text-[var(--text-tertiary)]">
        © {new Date().getFullYear()} Career Copilot. Built to help you land the job.
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <LandingContent />
    </AuthProvider>
  );
}
