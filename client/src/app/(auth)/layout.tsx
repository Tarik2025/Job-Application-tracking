import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Career Copilot — Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-[var(--text)]">Career Copilot</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
