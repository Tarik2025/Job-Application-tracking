'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FadeIn, Button } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { api } from '@/lib/api';

const DEGREE_BRANCHES = {
  'B.Tech': ['Computer Science Engineering', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Biotechnology', 'Aerospace Engineering', 'Automobile Engineering', 'Industrial Engineering', 'Instrumentation Engineering', 'Mining Engineering', 'Petroleum Engineering', 'Agricultural Engineering', 'Marine Engineering', 'Textile Engineering', 'Food Technology', 'Environmental Engineering', 'Metallurgical Engineering', 'Robotics Engineering', 'AI & Data Science', 'Cyber Security', 'IoT', 'Mechatronics', 'Biomedical Engineering', 'Production Engineering', 'Nanotechnology', 'Polymer Engineering', 'Ceramic Engineering'],
  'M.Tech': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'VLSI Design', 'Embedded Systems', 'Signal Processing', 'Machine Learning', 'Data Science', 'Structural Engineering', 'Power Systems', 'Control Systems', 'Thermal Engineering', 'Manufacturing Engineering'],
  'B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Biotechnology', 'Instrumentation Engineering'],
  'M.E.': ['Computer Science', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering', 'VLSI Design', 'Embedded Systems', 'Structural Engineering'],
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
  '12th Science': ['PCM', 'PCB', 'PCMB'],
  '12th Commerce': ['Commerce with Maths', 'Commerce without Maths'],
  '12th Arts': ['Arts / Humanities'],
  'Diploma': ['Computer Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Electronics', 'Automobile Engineering', 'IT', 'Chemical Engineering'],
};
const ALL_DEGREES = ['10th', '12th Science', '12th Commerce', '12th Arts', 'Diploma', 'B.Tech', 'B.E.', 'BCA', 'B.Sc', 'B.Com', 'BBA', 'BA', 'M.Tech', 'M.E.', 'MCA', 'M.Sc', 'M.Com', 'MBA', 'MA', 'PhD', 'Other'];

// Clean input component
function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>}
      {children}
      {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function Input({ label, error, ...props }) {
  return (
    <Field label={label} error={error}>
      <input {...props} className={`w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-secondary)]/50 ${error ? 'border-[var(--danger)]/50 focus:border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
    </Field>
  );
}

function Select({ label, value, onChange, options, placeholder, error, disabled }) {
  return (
    <Field label={label} error={error}>
      <select value={value} onChange={onChange} disabled={disabled}
        className={`w-full h-11 px-3 text-sm rounded-lg bg-[var(--bg-secondary)] border text-[var(--text)] outline-none transition-colors appearance-none cursor-pointer ${error ? 'border-[var(--danger)]/50' : 'border-[var(--border)] focus:border-[var(--primary)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function SearchSelect({ label, value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const filtered = options.filter(o => {
    const name = typeof o === 'string' ? o : o.label;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayValue = options.find(o => (typeof o === 'string' ? o : o.value) === value);
  const displayLabel = displayValue ? (typeof displayValue === 'string' ? displayValue : displayValue.label) : '';

  return (
    <Field label={label}>
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => !disabled && setOpen(!open)} disabled={disabled}
          className={`w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-left outline-none transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--primary)]'} ${value ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]/50'}`}>
          {displayLabel || placeholder || 'Select...'}
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-[var(--border)]">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." autoFocus
                className="w-full h-8 px-2.5 text-xs rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">No results</p>}
              {filtered.slice(0, 50).map((o, i) => {
                const val = typeof o === 'string' ? o : o.value;
                const lbl = typeof o === 'string' ? o : o.label;
                return (
                  <button key={i} type="button" onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${val === value ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text)] hover:bg-[var(--bg-secondary)]'}`}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState(''); // '', 'checking', 'exists', 'available'
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: '', country_code: '+91', gender: '', dob: '',
    user_type: '', college: '', degree: '', customDegree: '', branch: '', year_of_study: '', passout_year: '',
    company: '', designation: '', experience: '',
    city: '', state: '', country: '', linkedin: '', github: '', portfolio: ''
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Password
  const pwErrors = [];
  if (form.password.length > 0) {
    if (form.password.length < 8) pwErrors.push('8+ chars');
    if (!/[A-Z]/.test(form.password)) pwErrors.push('uppercase');
    if (!/[0-9]/.test(form.password)) pwErrors.push('number');
    if (!/[^A-Za-z0-9]/.test(form.password)) pwErrors.push('special char');
  }
  const pwStrength = form.password.length === 0 ? 0 : pwErrors.length === 0 ? 3 : pwErrors.length <= 2 ? 2 : 1;

  // Countries
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag')
      .then(r => r.json())
      .then(data => {
        setCountries(data.map(c => ({
          name: c.name.common, code: c.cca2, flag: c.flag,
          phone: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.[0] || ''}` : ''
        })).filter(c => c.phone).sort((a, b) => a.name.localeCompare(b.name)));
      }).catch(() => {});
  }, []);

  // States
  useEffect(() => {
    if (!form.country) { setStates([]); setCities([]); return; }
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: form.country })
    }).then(r => r.json()).then(d => setStates(d.data?.states?.map(s => s.name).sort() || []))
      .catch(() => setStates([]));
    set('state', ''); set('city', '');
  }, [form.country]);

  // Cities
  useEffect(() => {
    if (!form.state || !form.country) { setCities([]); return; }
    fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: form.country, state: form.state })
    }).then(r => r.json()).then(d => setCities(d.data?.sort() || []))
      .catch(() => setCities([]));
    set('city', '');
  }, [form.state]);

  // Email check
  useEffect(() => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setEmailStatus(''); return; }
    setEmailStatus('checking');
    const t = setTimeout(() => {
      api.checkEmail(form.email).then(d => setEmailStatus(d.exists ? 'exists' : 'available')).catch(() => setEmailStatus(''));
    }, 600);
    return () => clearTimeout(t);
  }, [form.email]);

  // Country code sync
  useEffect(() => {
    const c = countries.find(c => c.name === form.country);
    if (c?.phone) set('country_code', c.phone);
  }, [form.country, countries]);

  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0];

  const validate = () => {
    if (step === 1) {
      if (!form.name.trim()) return 'Name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email required';
      if (emailStatus === 'exists') return 'Email already registered';
      if (pwErrors.length > 0) return 'Password needs: ' + pwErrors.join(', ');
      if (form.password !== form.confirmPassword) return 'Passwords do not match';
      if (!form.phone || form.phone.length < 7) return 'Phone required (min 7 digits)';
      if (!form.gender) return 'Select gender';
      if (!form.dob) return 'Date of birth required';
    } else if (step === 2) {
      if (!form.user_type) return 'Select profile type';
    } else if (step === 3) {
      if (form.user_type === 'student') {
        if (!form.college.trim()) return 'College required';
        if (!form.degree) return 'Education required';
        if (form.degree === 'Other' && !form.customDegree.trim()) return 'Enter degree name';
        if (!form.branch) return 'Branch required';
        if (!form.year_of_study) return 'Year of study required';
      } else {
        if (!form.company.trim()) return 'Company required';
        if (!form.designation.trim()) return 'Designation required';
        if (!form.experience) return 'Experience required';
      }
    } else if (step === 4) {
      if (!form.country) return 'Country required';
      if (!form.state) return 'State required';
      if (!form.city) return 'City required';
    }
    return null;
  };

  const next = () => { const err = validate(); if (err) return setError(err); setError(''); setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    const err = validate();
    if (err) return setError(err);
    setLoading(true); setError('');
    try {
      const payload = { ...form, degree: form.degree === 'Other' ? form.customDegree : form.degree };
      delete payload.confirmPassword; delete payload.customDegree;
      await api.register(payload);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg)]">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[360px] bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] text-xl mx-auto mb-4">✓</div>
        <h2 className="text-lg font-semibold mb-1">Account Created!</h2>
        <p className="text-sm text-[var(--text-secondary)]">Redirecting to login...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--bg)]">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <FadeIn className="w-full max-w-[440px]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-lg">
          <Link href="/login" className="text-xs text-[var(--text-secondary)] no-underline hover:text-[var(--primary)] block mb-6">← Sign in instead</Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">C</div>
            <div>
              <h1 className="text-base font-semibold">Create Account</h1>
              <p className="text-[11px] text-[var(--text-secondary)]">Step {step} of 4</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {[1,2,3,4].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
            ))}
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[var(--danger)] p-3 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-4">{error}</motion.p>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <Input label="Full Name *" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} />

                <Field label="Email *" error={emailStatus === 'exists' ? '⚠ Already registered' : ''}>
                  <div className="relative">
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"
                      className={`w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-secondary)]/50 ${emailStatus === 'exists' ? 'border-[var(--danger)]/50' : emailStatus === 'available' ? 'border-[var(--success)]/50' : 'border-[var(--border)] focus:border-[var(--primary)]'}`} />
                    {emailStatus === 'checking' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">...</span>}
                    {emailStatus === 'available' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--success)]">✓</span>}
                  </div>
                </Field>

                {/* Phone */}
                <Field label="Phone *">
                  <div className="flex gap-2">
                    <SearchSelect value={form.country_code} onChange={v => set('country_code', v)} placeholder="Code"
                      options={countries.map(c => ({ value: c.phone, label: `${c.flag} ${c.phone}` }))} />
                    <input type="tel" placeholder="9876543210" value={form.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                      className="flex-1 h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
                  </div>
                </Field>

                {/* Password */}
                <Field label="Password *">
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 chars, uppercase, number, special"
                    className="w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
                  {form.password && (
                    <div className="flex gap-1 mt-1.5">
                      {[1,2,3].map(i => (
                        <div key={i} className={`flex-1 h-1 rounded-full ${pwStrength >= i ? (pwStrength === 1 ? 'bg-[var(--danger)]' : pwStrength === 2 ? 'bg-[var(--warning)]' : 'bg-[var(--success)]') : 'bg-[var(--border)]'}`} />
                      ))}
                    </div>
                  )}
                  {form.password && pwErrors.length > 0 && <p className="text-[10px] text-[var(--text-secondary)] mt-1">Need: {pwErrors.join(', ')}</p>}
                </Field>

                <Field label="Confirm Password *" error={form.confirmPassword && form.password !== form.confirmPassword ? 'Does not match' : ''}>
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Re-enter password"
                    className={`w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-secondary)]/50 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-[var(--danger)]/50' : 'border-[var(--border)] focus:border-[var(--primary)]'}`} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Select label="Gender *" value={form.gender} onChange={e => set('gender', e.target.value)} placeholder="Select" options={['Male', 'Female', 'Non-binary', 'Prefer not to say']} />
                  <Input label="Date of Birth *" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} max={maxDob} />
                </div>

                <Button variant="primary" className="w-full mt-2" onClick={next}>Continue →</Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <p className="text-sm text-[var(--text-secondary)] text-center">What describes you best?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: 'student', icon: '🎓', l: 'Student', d: 'Currently studying' }, { v: 'professional', icon: '💼', l: 'Professional', d: 'Working / experienced' }].map(o => (
                    <button key={o.v} onClick={() => set('user_type', o.v)} type="button"
                      className={`p-5 rounded-xl text-center cursor-pointer transition-all border-2 ${form.user_type === o.v ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/30'}`}>
                      <span className="text-2xl block mb-2">{o.icon}</span>
                      <span className="text-sm font-semibold block text-[var(--text)]">{o.l}</span>
                      <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">{o.d}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={back}>← Back</Button>
                  <Button variant="primary" className="flex-1" onClick={next}>Continue →</Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {form.user_type === 'student' ? (<>
                  <Field label="College / University *">
                    <CollegeAutocomplete value={form.college} onChange={v => set('college', v)} />
                  </Field>
                  <Select label="Highest Education *" value={form.degree} onChange={e => { set('degree', e.target.value); set('branch', ''); }} placeholder="Select" options={ALL_DEGREES} />
                  {form.degree === 'Other' && <Input label="Your Degree *" placeholder="e.g. B.Des, LLB" value={form.customDegree} onChange={e => set('customDegree', e.target.value)} />}
                  <Select label="Branch / Major *" value={form.branch} onChange={e => set('branch', e.target.value)} placeholder={form.degree ? "Select branch" : "Select degree first"} options={DEGREE_BRANCHES[form.degree] || []} disabled={!form.degree || form.degree === 'Other'} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Year *" value={form.year_of_study} onChange={e => set('year_of_study', e.target.value)} placeholder="Select" options={['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduated']} />
                    <Input label="Passout Year" placeholder="2025" value={form.passout_year} onChange={e => set('passout_year', e.target.value.replace(/\D/g,'').slice(0,4))} />
                  </div>
                </>) : (<>
                  <Field label="Company *">
                    <CompanyAutocomplete value={form.company} onChange={v => set('company', v)} />
                  </Field>
                  <Field label="Designation / Role *">
                    <RoleAutocomplete value={form.designation} onChange={v => set('designation', v)} />
                  </Field>
                  <Select label="Experience *" value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="Select" options={['Fresher','0-1 years','1-3 years','3-5 years','5-10 years','10+ years']} />
                </>)}
                <div className="flex gap-3 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={back}>← Back</Button>
                  <Button variant="primary" className="flex-1" onClick={next}>Continue →</Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <SearchSelect label="Country *" value={form.country} onChange={v => set('country', v)} placeholder="Search country..."
                  options={countries.map(c => ({ value: c.name, label: `${c.flag} ${c.name}` }))} />
                <div className="grid grid-cols-2 gap-3">
                  <SearchSelect label="State *" value={form.state} onChange={v => set('state', v)} placeholder="Select state" options={states} disabled={!states.length} />
                  <SearchSelect label="City *" value={form.city} onChange={v => set('city', v)} placeholder="Select city" options={cities} disabled={!cities.length} />
                </div>
                <Input label="LinkedIn (optional)" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={e => set('linkedin', e.target.value)} />
                <Input label="GitHub (optional)" placeholder="https://github.com/..." value={form.github} onChange={e => set('github', e.target.value)} />
                <Input label="Portfolio (optional)" placeholder="https://yoursite.com" value={form.portfolio} onChange={e => set('portfolio', e.target.value)} />
                <div className="flex gap-3 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={back}>← Back</Button>
                  <Button variant="primary" className="flex-1" loading={loading} onClick={submit}>Create Account</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-6 pt-5 border-t border-[var(--border)]">
            Already have an account? <Link href="/login" className="text-[var(--primary)] no-underline font-medium">Sign in</Link>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}

function CollegeAutocomplete({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (value.length >= 2) api.searchColleges(value).then(setSuggestions).catch(() => setSuggestions([]));
    else setSuggestions([]);
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder="Type to search..."
        className="w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-[180px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] cursor-pointer">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
function CompanyAutocomplete({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (value.length >= 2) {
      fetch('https://autocomplete.clearbit.com/v1/companies/suggest?query=' + encodeURIComponent(value))
        .then(r => r.json()).then(d => setSuggestions(d.slice(0, 8))).catch(() => setSuggestions([]));
    } else setSuggestions([]);
  }, [value]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder="Type company name..."
        className="w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => { onChange(s.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] cursor-pointer flex items-center gap-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{s.domain}</span>
            </button>
          ))}
          {value.length >= 2 && (
            <button type="button" onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-sm text-[var(--primary)] hover:bg-[var(--bg-secondary)] cursor-pointer border-t border-[var(--border)]">
              + Use "{value}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const COMMON_ROLES = ['Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer','Data Scientist','Data Analyst','Product Manager','UI/UX Designer','DevOps Engineer','Cloud Engineer','ML Engineer','QA Engineer','Mobile Developer','iOS Developer','Android Developer','Cybersecurity Analyst','Business Analyst','Project Manager','Technical Lead','Engineering Manager','Solutions Architect','Database Administrator','System Administrator','Network Engineer','Embedded Engineer','Game Developer','Blockchain Developer','AI Engineer','SRE','Technical Writer','Scrum Master','Sales Engineer','Support Engineer','Research Engineer','Intern'];

function RoleAutocomplete({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const filtered = value ? COMMON_ROLES.filter(r => r.toLowerCase().includes(value.toLowerCase())) : COMMON_ROLES;
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input type="text" value={value} onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder="Type or select role..."
        className="w-full h-11 px-3.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-secondary)]/50" />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto">
          {filtered.slice(0, 12).map((r, i) => (
            <button key={i} type="button" onClick={() => { onChange(r); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] cursor-pointer">{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

