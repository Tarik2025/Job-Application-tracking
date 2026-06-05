'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

const DEGREES = ['B.Tech', 'M.Tech', 'B.E.', 'M.E.', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'MBA', 'BBA', 'B.Com', 'M.Com', 'BA', 'MA', 'PhD', 'Other'];
const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Germany', 'Australia', 'Singapore', 'UAE', 'Japan', 'Other'];
const STATES = ['Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Delhi', 'Telangana', 'Uttar Pradesh', 'Gujarat', 'Rajasthan', 'West Bengal', 'Kerala', 'Punjab', 'Haryana', 'Bihar', 'Madhya Pradesh', 'Other'];
const COUNTRY_CODES = ['+91 India', '+1 USA', '+44 UK', '+61 Australia', '+971 UAE', '+65 Singapore', '+49 Germany', '+81 Japan', '+86 China', '+33 France', '+39 Italy', '+7 Russia', '+55 Brazil', '+82 South Korea'];

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', color: 'var(--danger)', width: '25%' };
  if (score <= 4) return { label: 'Medium', color: 'var(--warning, #fbbf24)', width: '55%' };
  return { label: 'Strong', color: 'var(--success)', width: '100%' };
}

function getPasswordErrors(pw) {
  const errs = [];
  if (pw.length < 8) errs.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) errs.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) errs.push('One lowercase letter');
  if (!/[0-9]/.test(pw)) errs.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw)) errs.push('One special character (!@#$...)');
  return errs;
}

function CollegeInput({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (value.length >= 2 && !customMode) {
      api.searchColleges(value).then(setSuggestions).catch(() => setSuggestions([]));
    } else { setSuggestions([]); }
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-[13px] font-medium text-[var(--muted)]">College / University</label>
      <input
        type="text" value={value} onChange={e => { onChange(e.target.value); setShowSugg(true); setCustomMode(false); }}
        placeholder="Start typing to search..."
        onFocus={() => setShowSugg(true)}
        className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60"
      />
      {showSugg && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 max-h-[180px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { onChange(s); setShowSugg(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--input)] cursor-pointer transition-colors">
              {s}
            </button>
          ))}
          <button onClick={() => { setCustomMode(true); setShowSugg(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--input)] cursor-pointer border-t border-[var(--border)]">
            + Add "{value}" as new college
          </button>
        </div>
      )}
      {showSugg && value.length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 z-20">
          <p className="text-xs text-[var(--muted)]">No match found. Your entry will be saved for others.</p>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPwRules, setShowPwRules] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', country_code: '+91', gender: '', dob: '',
    user_type: '',
    college: '', degree: '', branch: '', year_of_study: '',
    company: '', designation: '', experience: '',
    city: '', state: '', country: 'India',
    linkedin: '', github: '', portfolio: ''
  });


  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const pwStrength = getPasswordStrength(form.password);
  const pwErrors = getPasswordErrors(form.password);

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Valid email is required';
    if (pwErrors.length > 0) return 'Password does not meet requirements';
    if (!form.phone || form.phone.length < 10) return 'Valid phone number required';
    if (form.dob) {
      const birth = new Date(form.dob);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
      if (age < 5) return 'User must be at least 5 years old';
    }
    return null;
  };

  const next = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
      setError(''); setStep(2);
    } else if (step === 2) {
      if (!form.user_type) return setError('Select your profile type');
      setError(''); setStep(3);
    } else if (step === 3) {
      setError(''); setStep(4);
    }
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await api.register(form);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[360px] bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-10 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--success)] flex items-center justify-center text-[var(--success)] font-bold mx-auto mb-4">✓</div>
        <h2 className="text-lg font-semibold mb-1">Account created</h2>
        <p className="text-[13px] text-[var(--muted)]">Redirecting to sign in...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-[460px]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-6 sm:p-8">
          <Link href="/login" className="text-xs text-[var(--muted)] no-underline hover:text-[var(--accent)] transition-colors block mb-5">← Back to sign in</Link>

          <h1 className="text-lg font-semibold mb-1">Create account</h1>
          <p className="text-[13px] text-[var(--muted)] mb-5">Step {step} of 4</p>

          {/* Progress */}
          <div className="flex gap-1.5 mb-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 h-[3px] rounded-full transition-colors" style={{ background: step >= s ? 'var(--accent)' : 'var(--border)' }} />
            ))}
          </div>

          {error && <p className="text-[13px] text-[var(--danger)] p-2.5 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-4">{error}</p>}

          <AnimatePresence mode="wait">
            {/* Step 1: Account info */}
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3.5">
                <InputField label="Full name *" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
                <InputField label="Email *" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />

                {/* Phone with country code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Phone *</label>
                  <div className="flex gap-2">
                    <select value={form.country_code} onChange={e => set('country_code', e.target.value)}
                      className="w-[100px] h-[42px] px-2 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)]">
                      {COUNTRY_CODES.map(c => {
                        const code = c.split(' ')[0];
                        return <option key={c} value={code}>{c}</option>;
                      })}
                    </select>
                    <input type="tel" placeholder="9876543210" value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                      className="flex-1 h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60"
                      required />
                  </div>
                </div>

                {/* Password with strength */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Password *</label>
                  <input
                    type="password" value={form.password}
                    onChange={e => set('password', e.target.value)}
                    onFocus={() => setShowPwRules(true)}
                    placeholder="Min 8 chars, uppercase, number, special"
                    className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60"
                  />
                  {form.password && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: pwStrength.width, background: pwStrength.color }} />
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                    </div>
                  )}
                  {showPwRules && form.password && pwErrors.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {pwErrors.map((e, i) => (
                        <li key={i} className="text-[11px] text-[var(--danger)] flex items-center gap-1">
                          <span>·</span>{e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {showPwRules && form.password && pwErrors.length === 0 && (
                    <p className="text-[11px] text-[var(--success)] mt-1">Password meets all requirements</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <SelectDropdown label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)} placeholder="Select" options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--muted)]">Date of birth</label>
                    <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0]}
                      className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>

                <Button variant="primary" className="w-full mt-2" onClick={next}>Continue</Button>
              </motion.div>
            )}

            {/* Step 2: Profile type */}
            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-4">
                <p className="text-[13px] text-[var(--muted)] text-center">What best describes you?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: 'student', l: 'Student', d: 'Currently studying' }, { v: 'professional', l: 'Professional', d: 'Working or experienced' }].map(o => (
                    <button key={o.v} onClick={() => set('user_type', o.v)}
                      className={`p-5 rounded-[10px] text-center cursor-pointer transition-all border ${form.user_type === o.v ? 'bg-[var(--accent)]/8 border-[var(--accent)] text-[var(--accent)]' : 'bg-[var(--input)] border-[var(--border)] text-[var(--text)]'}`}>
                      <span className="text-sm font-semibold block">{o.l}</span>
                      <span className="text-[11px] text-[var(--muted)] block mt-1">{o.d}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5 mt-1">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button variant="primary" className="flex-1" onClick={next}>Continue</Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Education / Work details */}
            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3.5">
                {form.user_type === 'student' ? (<>
                  <CollegeInput value={form.college} onChange={v => set('college', v)} />
                  <div className="grid grid-cols-2 gap-2.5">
                    <SelectDropdown label="Degree" value={form.degree} onChange={e => set('degree', e.target.value)} placeholder="Select" options={DEGREES} />
                    <InputField label="Branch / Major" placeholder="Computer Science" value={form.branch} onChange={e => set('branch', e.target.value)} />
                  </div>
                  <SelectDropdown label="Year of study" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} placeholder="Select" options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduated']} />
                </>) : (<>
                  <InputField label="Company" placeholder="Google, TCS, Infosys..." value={form.company} onChange={e => set('company', e.target.value)} />
                  <InputField label="Designation / Role" placeholder="Software Engineer" value={form.designation} onChange={e => set('designation', e.target.value)} />
                  <SelectDropdown label="Experience" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="Select" options={['Fresher', '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years']} />
                </>)}
                <div className="flex gap-2.5 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                  <Button variant="primary" className="flex-1" onClick={next}>Continue</Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Location + Links */}
            {step === 4 && (
              <motion.div key="4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <InputField label="City" placeholder="Bangalore" value={form.city} onChange={e => set('city', e.target.value)} />
                  <SelectDropdown label="State" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Select" options={STATES} />
                </div>
                <SelectDropdown label="Country" value={form.country} onChange={e => set('country', e.target.value)} options={COUNTRIES} />
                <InputField label="LinkedIn URL (optional)" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
                <InputField label="GitHub URL (optional)" placeholder="https://github.com/..." value={form.github} onChange={e => set('github', e.target.value)} />
                <InputField label="Portfolio (optional)" placeholder="https://yoursite.com" value={form.portfolio} onChange={e => set('portfolio', e.target.value)} />
                <div className="flex gap-2.5 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(3)}>Back</Button>
                  <Button variant="primary" className="flex-1" loading={loading} onClick={submit}>Create account</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-[var(--muted)] mt-6 pt-5 border-t border-[var(--border)]">
            Have an account? <Link href="/login" className="text-[var(--accent)] no-underline font-medium">Sign in</Link>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
