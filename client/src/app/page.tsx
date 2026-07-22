'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Briefcase, BarChart2, Mail, FileText, Zap, Shield,
  ArrowRight, CheckCircle, Star, TrendingUp, Users, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ROUTES } from '@/constants';

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <Briefcase size={22} />,
    title: 'Kanban Pipeline',
    desc: 'Drag-and-drop board to track every application from applied to offer.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: <Mail size={22} />,
    title: 'Email Classifier',
    desc: 'AI reads your inbox and auto-tags rejections, interviews, and offers.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <FileText size={22} />,
    title: 'Resume Matcher',
    desc: 'Score your resume against any JD and get a skill gap analysis instantly.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <BarChart2 size={22} />,
    title: 'Deep Analytics',
    desc: 'Response rates, interview conversion, weekly streaks — all visualized.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: <Zap size={22} />,
    title: 'Interview Prep',
    desc: 'Generate role-specific questions and model answers powered by Gemini AI.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: <Shield size={22} />,
    title: 'Secure & Private',
    desc: 'JWT auth, CSRF protection, encrypted storage. Your data stays yours.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
];

const stats = [
  { icon: <Users size={18} />, value: '10,000+', label: 'Job seekers' },
  { icon: <Briefcase size={18} />, value: '500K+', label: 'Applications tracked' },
  { icon: <TrendingUp size={18} />, value: '3×', label: 'Faster job search' },
  { icon: <Award size={18} />, value: '94%', label: 'User satisfaction' },
];

const steps = [
  { num: '01', title: 'Create your account', desc: 'Sign up free in under 30 seconds. No credit card needed.' },
  { num: '02', title: 'Add your applications', desc: 'Manually add jobs or use the Chrome extension to save with one click.' },
  { num: '03', title: 'Let AI do the heavy lifting', desc: 'Classify emails, match resumes, prep for interviews — all automated.' },
  { num: '04', title: 'Land the job', desc: 'Track your progress, hit your goals, and celebrate your offer.' },
];

// ─── Section wrapper with scroll-triggered animation ─────────────────────────

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating orb background ──────────────────────────────────────────────────

function Orbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/[0.08] blur-[100px]" />
      <div className="absolute bottom-[10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-blue-600/[0.08] blur-[100px]" />
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      className="flex flex-col items-center gap-2 text-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center"
      >
        {icon}
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-2xl font-bold text-[var(--text)]"
      >
        {value}
      </motion.p>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </motion.div>
  );
}

// ─── Main landing content ─────────────────────────────────────────────────────

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(ROUTES.DASHBOARD);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const reason = searchParams?.get('reason');
    if (reason === 'session_expired') toast.warning('Your session has expired. Please sign in again.');
    if (reason === 'account_deactivated') toast.error('Your account has been deactivated. Contact support.');
  }, [searchParams]);

  // Don't flash blank page — only hide when confirmed authenticated
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)]/60 bg-[var(--bg)]/70 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="font-bold tracking-tight">Career Copilot</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.LOGIN}
              className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors rounded-lg hover:bg-[var(--input)]"
            >
              Log in
            </Link>
            <Link
              href={ROUTES.SIGNUP}
              className="px-4 py-1.5 text-sm font-medium bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--accent-h)] transition-colors shadow-md shadow-[var(--primary)]/20"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-14 px-6">
        <Orbs />
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/[0.08] text-[var(--primary)] text-xs font-medium mb-8"
          >
            <Zap size={11} className="fill-current" />
            AI-Powered Job Application Tracker
            <Star size={10} className="fill-current opacity-60" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" as const }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
          >
            Your job search,{' '}
            <span className="relative">
              <span className="text-[var(--primary)]">supercharged</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" as const }}
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--primary)]/40 origin-left rounded-full"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Track every application, classify recruiter emails with AI, match your resume to job descriptions, and prep for interviews — all in one beautiful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          >
            <Link
              href={ROUTES.SIGNUP}
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--accent-h)] transition-all shadow-xl shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 hover:-translate-y-0.5"
            >
              Get started for free
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium text-sm hover:bg-[var(--input)] hover:border-[var(--primary)]/30 transition-all"
            >
              Already have an account? Log in
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]"
          >
            {['Free forever', 'No credit card', 'Chrome extension included', 'AI-powered'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-emerald-400" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-[var(--border)] to-transparent"
          />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-[var(--border)]/60 bg-[var(--bg-secondary)]/40">
        <div className="max-w-4xl mx-auto">
          <Section className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s) => <StatItem key={s.label} {...s} />)}
          </Section>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-[var(--primary)] uppercase tracking-widest mb-3">
              Everything you need
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4">
              Built for serious job seekers
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Every feature is designed to save you time and give you an edge over other candidates.
            </motion.p>
          </Section>

          <Section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/30 hover:bg-[var(--bg-secondary)] transition-all cursor-default"
              >
                <div className={`w-11 h-11 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </Section>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-[var(--bg-secondary)]/30 border-y border-[var(--border)]/60">
        <div className="max-w-5xl mx-auto">
          <Section className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-[var(--primary)] uppercase tracking-widest mb-3">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-[var(--text)]">
              Up and running in minutes
            </motion.h2>
          </Section>

          <Section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.num} variants={fadeUp} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-12px)] w-full h-px bg-gradient-to-r from-[var(--border)] to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mb-4">
                    <span className="text-sm font-bold text-[var(--primary)]">{s.num}</span>
                  </div>
                  <h3 className="font-semibold text-[var(--text)] mb-2">{s.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </Section>
        </div>
      </section>

      {/* ── CTA / Auth section ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--primary)]/[0.06] blur-[120px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <Section>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-bold text-[var(--text)] mb-4 leading-tight">
              Ready to land your<br />
              <span className="text-[var(--primary)]">dream job?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[var(--text-secondary)] mb-10 text-lg">
              Join thousands of job seekers who track smarter, not harder.
            </motion.p>

            {/* Auth cards */}
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* New user */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--primary)]/30">
                  <Star size={16} className="text-white fill-white" />
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-1">New here?</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Create a free account and start tracking today.</p>
                <Link
                  href={ROUTES.SIGNUP}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:gap-2.5 transition-all"
                >
                  Create account <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Returning user */}
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--input)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <Briefcase size={16} className="text-[var(--text-secondary)]" />
                </div>
                <h3 className="font-semibold text-[var(--text)] mb-1">Welcome back</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Sign in to continue your job search journey.</p>
                <Link
                  href={ROUTES.LOGIN}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text)] hover:gap-2.5 transition-all"
                >
                  Log in <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border)]/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--primary)] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text)]">Career Copilot</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} Career Copilot. Built to help you land the job.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <Suspense>
        <LandingContent />
      </Suspense>
    </AuthProvider>
  );
}
