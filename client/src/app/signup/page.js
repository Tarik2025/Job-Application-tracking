'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FadeIn, InputField, SelectDropdown, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

// Degree → Branch mapping
const DEGREE_BRANCHES = {
  'B.Tech': ['Computer Science Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Biotechnology', 'Aerospace Engineering', 'Automobile Engineering', 'Industrial Engineering', 'Instrumentation Engineering', 'Mining Engineering', 'Petroleum Engineering', 'Agricultural Engineering', 'Marine Engineering', 'Textile Engineering', 'Food Technology', 'Environmental Engineering', 'Metallurgical Engineering', 'Polymer Engineering', 'Ceramic Engineering', 'Production Engineering', 'Biomedical Engineering', 'Robotics Engineering', 'AI & Data Science', 'Cyber Security', 'IoT', 'Mechatronics', 'Nanotechnology'],
  'M.Tech': ['Computer Science Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'VLSI Design', 'Embedded Systems', 'Signal Processing', 'Machine Learning', 'Data Science', 'Structural Engineering', 'Power Systems', 'Control Systems', 'Thermal Engineering', 'Manufacturing Engineering'],
  'B.E.': ['Computer Science Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Biotechnology', 'Instrumentation Engineering'],
  'M.E.': ['Computer Science Engineering', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering', 'VLSI Design', 'Embedded Systems', 'Structural Engineering'],
  'BCA': ['Computer Applications', 'Data Science', 'Cloud Computing', 'Cyber Security', 'AI & ML', 'Web Development', 'Mobile App Development'],
  'MCA': ['Computer Applications', 'Data Science', 'Cloud Computing', 'Cyber Security', 'AI & ML', 'Software Engineering', 'Database Management'],
  'B.Sc': ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Statistics', 'Electronics', 'Biotechnology', 'Microbiology', 'Zoology', 'Botany', 'Environmental Science', 'Data Science', 'IT'],
  'M.Sc': ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Statistics', 'Data Science', 'AI & ML', 'Biotechnology', 'Microbiology', 'Environmental Science'],
  'MBA': ['Marketing', 'Finance', 'Human Resources', 'Operations Management', 'Business Analytics', 'International Business', 'Entrepreneurship', 'Supply Chain Management', 'Project Management', 'IT Management', 'Healthcare Management', 'Digital Marketing', 'Strategy & Consulting', 'Retail Management', 'Banking & Insurance'],
  'BBA': ['Marketing', 'Finance', 'Human Resources', 'International Business', 'Entrepreneurship', 'Banking', 'Digital Marketing', 'Retail Management', 'Aviation Management', 'Hospital Management'],
  'B.Com': ['Accounting', 'Finance', 'Taxation', 'Banking', 'Business Economics', 'E-Commerce', 'Computer Applications', 'Honours'],
  'M.Com': ['Accounting', 'Finance', 'Taxation', 'Banking', 'Business Economics', 'International Trade'],
  'BA': ['English', 'Hindi', 'History', 'Political Science', 'Economics', 'Psychology', 'Sociology', 'Philosophy', 'Geography', 'Journalism', 'Mass Communication'],
  'MA': ['English', 'Hindi', 'History', 'Political Science', 'Economics', 'Psychology', 'Sociology', 'Philosophy', 'Public Administration'],
  'PhD': ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Engineering', 'Management', 'Biotechnology', 'Economics', 'Psychology', 'Literature'],
  '10th': ['General'],
  '12th Science': ['PCM (Physics, Chemistry, Math)', 'PCB (Physics, Chemistry, Biology)', 'PCMB'],
  '12th Commerce': ['Commerce with Maths', 'Commerce without Maths'],
  '12th Arts': ['Arts / Humanities'],
  'Diploma': ['Computer Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Electronics', 'Automobile Engineering', 'IT', 'Chemical Engineering'],
};

const ALL_DEGREES = ['10th', '12th Science', '12th Commerce', '12th Arts', 'Diploma', 'B.Tech', 'B.E.', 'BCA', 'B.Sc', 'B.Com', 'BBA', 'BA', 'M.Tech', 'M.E.', 'MCA', 'M.Sc', 'M.Com', 'MBA', 'MA', 'PhD', 'Other'];

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
  const ref = useRef(null);

  useEffect(() => {
    if (value.length >= 2) api.searchColleges(value).then(setSuggestions).catch(() => setSuggestions([]));
    else setSuggestions([]);
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-[13px] font-medium text-[var(--muted)]">College / University *</label>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setShowSugg(true); }}
        placeholder="Start typing..." onFocus={() => setShowSugg(true)}
        className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60" />
      {showSugg && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 max-h-[180px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { onChange(s); setShowSugg(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--input)] cursor-pointer">{s}</button>
          ))}
          <button onClick={() => setShowSugg(false)} className="w-full text-left px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--input)] cursor-pointer border-t border-[var(--border)]">+ Add "{value}" as new</button>
        </div>
      )}
    </div>
  );
}

function BranchInput({ degree, value, onChange }) {
  const [showSugg, setShowSugg] = useState(false);
  const branches = DEGREE_BRANCHES[degree] || [];
  const filtered = value ? branches.filter(b => b.toLowerCase().includes(value.toLowerCase())) : branches;
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-[13px] font-medium text-[var(--muted)]">Branch / Major *</label>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setShowSugg(true); }}
        placeholder={degree ? "Type or select..." : "Select degree first"} onFocus={() => setShowSugg(true)} disabled={!degree}
        className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60 disabled:opacity-50" />
      {showSugg && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 max-h-[180px] overflow-y-auto">
          {filtered.map((b, i) => (
            <button key={i} onClick={() => { onChange(b); setShowSugg(false); }} className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--input)] cursor-pointer">{b}</button>
          ))}
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
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', country_code: '+91', gender: '', dob: '',
    user_type: '',
    college: '', degree: '', customDegree: '', branch: '', year_of_study: '', passout_year: '',
    company: '', designation: '', experience: '',
    city: '', state: '', country: 'India',
    linkedin: '', github: '', portfolio: ''
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const pwStrength = getPasswordStrength(form.password);
  const pwErrors = getPasswordErrors(form.password);

  // Fetch countries from REST API
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag')
      .then(r => r.json())
      .then(data => {
        const sorted = data.map(c => ({
          name: c.name.common,
          code: c.cca2,
          flag: c.flag,
          phone: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.[0] || ''}` : ''
        })).sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
      }).catch(() => {});
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (!form.country) { setStates([]); return; }
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: form.country })
    }).then(r => r.json()).then(d => {
      if (d.data?.states) setStates(d.data.states.map(s => s.name).sort());
      else setStates([]);
    }).catch(() => setStates([]));
    set('state', ''); set('city', '');
  }, [form.country]);

  // Fetch cities when state changes
  useEffect(() => {
    if (!form.country || !form.state) { setCities([]); return; }
    fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: form.country, state: form.state })
    }).then(r => r.json()).then(d => {
      if (d.data) setCities(d.data.sort());
      else setCities([]);
    }).catch(() => setCities([]));
    set('city', '');
  }, [form.state]);

  // Real-time email check
  useEffect(() => {
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) { setEmailExists(false); return; }
    const timer = setTimeout(() => {
      setEmailChecking(true);
      api.login({ email: form.email, password: '___check___' })
        .catch(err => { setEmailExists(err.message === 'Invalid credentials' || err.message === 'Account deactivated'); })
        .finally(() => setEmailChecking(false));
    }, 800);
    return () => clearTimeout(timer);
  }, [form.email]);

  // Update country code when country changes
  useEffect(() => {
    const c = countries.find(c => c.name === form.country);
    if (c?.phone) set('country_code', c.phone);
  }, [form.country, countries]);

  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];

  const validateStep1 = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Full name is required (min 2 chars)';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email is required';
    if (emailExists) return 'This email is already registered';
    if (pwErrors.length > 0) return 'Password does not meet requirements';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!form.phone || form.phone.length < 7) return 'Valid phone number required (min 7 digits)';
    if (!form.gender) return 'Gender is required';
    if (!form.dob) return 'Date of birth is required';
    return null;
  };

  const validateStep3 = () => {
    if (form.user_type === 'student') {
      if (!form.college.trim()) return 'College is required';
      if (!form.degree) return 'Degree/Education is required';
      if (form.degree === 'Other' && !form.customDegree.trim()) return 'Enter your degree name';
      if (!form.branch.trim()) return 'Branch/Major is required';
      if (!form.year_of_study) return 'Year of study is required';
    } else {
      if (!form.company.trim()) return 'Company is required';
      if (!form.designation.trim()) return 'Designation is required';
      if (!form.experience) return 'Experience is required';
    }
    return null;
  };

  const validateStep4 = () => {
    if (!form.country) return 'Country is required';
    if (!form.state) return 'State is required';
    if (!form.city) return 'City is required';
    return null;
  };

  const next = () => {
    setError('');
    if (step === 1) { const err = validateStep1(); if (err) return setError(err); setStep(2); }
    else if (step === 2) { if (!form.user_type) return setError('Select your profile type'); setStep(3); }
    else if (step === 3) { const err = validateStep3(); if (err) return setError(err); setStep(4); }
  };

  const submit = async () => {
    const err = validateStep4();
    if (err) return setError(err);
    setLoading(true); setError('');
    try {
      const payload = { ...form, degree: form.degree === 'Other' ? form.customDegree : form.degree };
      delete payload.confirmPassword;
      delete payload.customDegree;
      await api.register(payload);
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

  const selectedCountry = countries.find(c => c.name === form.country);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-[500px]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-6 sm:p-8">
          <Link href="/login" className="text-xs text-[var(--muted)] no-underline hover:text-[var(--accent)] transition-colors block mb-5">← Back to sign in</Link>

          <h1 className="text-lg font-semibold mb-1">Create account</h1>
          <p className="text-[13px] text-[var(--muted)] mb-5">Step {step} of 4</p>

          <div className="flex gap-1.5 mb-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 h-[3px] rounded-full transition-colors" style={{ background: step >= s ? 'var(--accent)' : 'var(--border)' }} />
            ))}
          </div>

          {error && <p className="text-[13px] text-[var(--danger)] p-2.5 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-4">{error}</p>}

          <AnimatePresence mode="wait">
            {/* Step 1: Account */}
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3.5">
                <InputField label="Full name *" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Email *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"
                    className={`w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60 ${emailExists ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`} />
                  {emailChecking && <p className="text-[11px] text-[var(--muted)]">Checking...</p>}
                  {emailExists && <p className="text-[11px] text-[var(--danger)]">⚠ This email is already registered</p>}
                </div>

                {/* Phone with flag */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Phone *</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 h-[42px] px-2.5 rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-sm min-w-[90px]">
                      <span className="text-lg">{selectedCountry?.flag || '🇮🇳'}</span>
                      <span className="text-[var(--text)]">{form.country_code || '+91'}</span>
                    </div>
                    <input type="tel" placeholder="9876543210" value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                      className="flex-1 h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Password *</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} onFocus={() => setShowPwRules(true)}
                    placeholder="Min 8 chars, uppercase, number, special"
                    className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60" />
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
                      {pwErrors.map((e, i) => <li key={i} className="text-[11px] text-[var(--danger)] flex items-center gap-1"><span>·</span>{e}</li>)}
                    </ul>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Confirm Password *</label>
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border text-[var(--text)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)] placeholder:opacity-60 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`} />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-[11px] text-[var(--danger)]">Passwords do not match</p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && form.password && (
                    <p className="text-[11px] text-[var(--success)]">✓ Passwords match</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <SelectDropdown label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)} placeholder="Select" options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--muted)]">Date of birth *</label>
                    <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} max={maxDob}
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
                  {[{ v: 'student', l: '🎓 Student', d: 'Currently studying' }, { v: 'professional', l: '💼 Professional', d: 'Working or experienced' }].map(o => (
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

            {/* Step 3: Education / Work */}
            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3.5">
                {form.user_type === 'student' ? (<>
                  <CollegeInput value={form.college} onChange={v => set('college', v)} />

                  <SelectDropdown label="Highest Education *" value={form.degree} onChange={e => { set('degree', e.target.value); set('branch', ''); }} placeholder="Select" options={ALL_DEGREES} />

                  {form.degree === 'Other' && (
                    <InputField label="Enter your degree *" placeholder="e.g. B.Des, LLB, MBBS" value={form.customDegree} onChange={e => set('customDegree', e.target.value)} />
                  )}

                  <BranchInput degree={form.degree} value={form.branch} onChange={v => set('branch', v)} />

                  <div className="grid grid-cols-2 gap-2.5">
                    <SelectDropdown label="Year of study *" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} placeholder="Select" options={['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduated']} />
                    <InputField label="Passout Year" placeholder="2025" value={form.passout_year} onChange={e => set('passout_year', e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </div>
                </>) : (<>
                  <InputField label="Company *" placeholder="Google, TCS, Infosys..." value={form.company} onChange={e => set('company', e.target.value)} />
                  <InputField label="Designation *" placeholder="Software Engineer" value={form.designation} onChange={e => set('designation', e.target.value)} />
                  <SelectDropdown label="Experience *" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="Select" options={['Fresher', '0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years']} />
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-[var(--muted)]">Country *</label>
                  <select value={form.country} onChange={e => set('country', e.target.value)}
                    className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)]">
                    <option value="">Select country</option>
                    {countries.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--muted)]">State *</label>
                    <select value={form.state} onChange={e => set('state', e.target.value)}
                      className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)]" disabled={!states.length}>
                      <option value="">{states.length ? 'Select state' : 'Select country first'}</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-[var(--muted)]">City *</label>
                    <select value={form.city} onChange={e => set('city', e.target.value)}
                      className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--accent)]" disabled={!cities.length}>
                      <option value="">{cities.length ? 'Select city' : 'Select state first'}</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <InputField label="LinkedIn (optional)" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
                <InputField label="GitHub (optional)" placeholder="https://github.com/..." value={form.github} onChange={e => set('github', e.target.value)} />
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
