'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight,
  Zap, CheckCircle, GraduationCap, Briefcase, MapPin, Target, AtSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { Country, State, City } from 'country-state-city';
import { authApi } from '@/services/api/auth.api';
import { collegesApi, stacksApi } from '@/services/api/search.api';
import { queryKeys } from '@/services/queryKeys';
import { ROUTES, STALE_TIMES } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormElements';
import { Combobox, MultiCombobox } from '@/components/ui/Combobox';
import { getErrorMessage } from '@/utils';
import { useDebounce } from '@/hooks';
import { useAuth } from '@/providers/AuthProvider';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1 — Account
  name: z.string().min(2, 'At least 2 characters'),
  username: z.string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscore'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[0-9]/, 'Needs a number')
    .regex(/[^A-Za-z0-9]/, 'Needs a special character'),
  confirm_password: z.string(),
  security_question: z.string().min(1, 'Pick a security question'),
  security_answer: z.string().min(2, 'Enter your answer'),

  // Step 2 — Type
  user_type: z.enum(['student', 'professional']),

  // Step 3 — Student fields
  college: z.string().optional(),
  degree: z.string().optional(),
  branch: z.string().optional(),
  year_of_study: z.string().optional(),
  passout_year: z.string().optional(),

  // Step 3 — Professional fields
  company: z.string().optional(),
  designation: z.string().optional(),
  experience: z.string().optional(),
  graduation_year: z.string().optional(),

  // Step 4 — Location
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),

  // Step 5 — Career
  preferred_role: z.string().optional(),
  skills: z.string().optional(),
  stacks: z.array(z.string()).optional(),
  target_stacks: z.array(z.string()).optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type FormData = z.infer<typeof schema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favourite movie?",
  "What was your childhood nickname?",
];

const DEGREES = [
  'B.Tech', 'B.E.', 'B.Sc', 'B.Com', 'B.A.', 'BCA', 'BBA',
  'M.Tech', 'M.E.', 'M.Sc', 'MBA', 'MCA', 'M.A.',
  'Ph.D', 'Diploma', 'Integrated M.Tech', 'B.Arch', 'MBBS', 'Other',
];

const BRANCHES = [
  'Computer Science', 'Information Technology', 'Electronics & Communication',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Biotechnology', 'Data Science', 'AI & ML',
  'Cyber Security', 'Cloud Computing', 'Mathematics', 'Physics', 'Chemistry',
  'Commerce', 'Economics', 'Business Administration', 'Other',
];

const YEARS_OF_STUDY = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduated'];

const EXPERIENCE_OPTIONS = [
  '0–1 years', '1–2 years', '2–3 years', '3–5 years',
  '5–7 years', '7–10 years', '10–15 years', '15+ years',
];

const COMMON_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb',
  'Infosys', 'TCS', 'Wipro', 'HCL', 'Cognizant', 'Accenture', 'IBM', 'Capgemini',
  'Deloitte', 'Oracle', 'Salesforce', 'Adobe', 'Flipkart', 'Swiggy', 'Zomato',
  'Paytm', "BYJU'S", 'Razorpay', 'PhonePe', 'Ola', 'Meesho', 'Freshworks',
];

const COMMON_DESIGNATIONS = [
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'DevOps Engineer', 'SRE', 'Data Engineer', 'Data Scientist', 'ML Engineer',
  'Product Manager', 'Engineering Manager', 'Tech Lead', 'Architect',
  'QA Engineer', 'Business Analyst', 'UI/UX Designer', 'Intern',
];

const COMMON_ROLES = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
  'Mobile Engineer (iOS)', 'Mobile Engineer (Android)', 'React Native Developer',
  'DevOps / Platform Engineer', 'SRE', 'Data Engineer', 'Data Scientist',
  'ML Engineer', 'AI Engineer', 'Cloud Engineer', 'Security Engineer',
  'Product Manager', 'Engineering Manager', 'Tech Lead', 'Solutions Architect',
  'QA / SDET', 'UI/UX Designer', 'Business Analyst',
];

const STEPS = [
  { label: 'Account', icon: <Lock size={13} /> },
  { label: 'Type', icon: <User size={13} /> },
  { label: 'Details', icon: <GraduationCap size={13} /> },
  { label: 'Location', icon: <MapPin size={13} /> },
  { label: 'Career', icon: <Target size={13} /> },
];

const PERKS = [
  'Free forever — no credit card needed',
  'AI-powered email classification',
  'Resume vs JD match scoring',
  'Chrome extension for 1-click saves',
  'Interview question generator',
  'Daily streak & goal tracking',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [collegeQuery, setCollegeQuery] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const debouncedCollegeQ = useDebounce(collegeQuery, 300);
  const debouncedUsername = useDebounce(usernameInput, 500);

  // Redirect authenticated users away from signup
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace(ROUTES.DASHBOARD);
  }, [isAuthenticated, authLoading, router]);

  const { control, register, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { user_type: 'student', stacks: [], target_stacks: [] },
  });

  const userType = watch('user_type');
  const selectedCountryName = watch('country');
  const selectedStateName = watch('state');

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: colleges = [], isFetching: loadingColleges } = useQuery({
    queryKey: queryKeys.colleges.search(debouncedCollegeQ),
    queryFn: () => collegesApi.search(debouncedCollegeQ),
    staleTime: STALE_TIMES.STATIC,
    enabled: debouncedCollegeQ.length >= 2,
  });

  const { data: allStacks = [] } = useQuery({
    queryKey: queryKeys.stacks.all(),
    queryFn: stacksApi.list,
    staleTime: STALE_TIMES.STATIC,
  });

  // Username availability check
  const { data: usernameCheck } = useQuery({
    queryKey: ['username-check', debouncedUsername],
    queryFn: () => authApi.checkUsername(debouncedUsername),
    enabled: debouncedUsername.length >= 3 && /^[a-z0-9_]+$/.test(debouncedUsername),
    staleTime: 0,
  });

  // Country / State / City — store names in form, resolve ISO codes for lookups
  const allCountries = Country.getAllCountries();
  const countryNames = allCountries.map((c) => c.name);

  const selectedCountryISO = allCountries.find((c) => c.name === selectedCountryName)?.isoCode ?? '';
  const allStatesForCountry = selectedCountryISO ? State.getStatesOfCountry(selectedCountryISO) : [];
  const stateNames = allStatesForCountry.map((s) => s.name);

  const selectedStateISO = allStatesForCountry.find((s) => s.name === selectedStateName)?.isoCode ?? '';
  const cities = selectedCountryISO && selectedStateISO
    ? City.getCitiesOfState(selectedCountryISO, selectedStateISO).map((c) => c.name)
    : [];

  // ── Mutation ──────────────────────────────────────────────────────────────

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => authApi.register({
      name: data.name,
      email: data.email,
      username: data.username,
      password: data.password,
      user_type: data.user_type,
      college: data.college,
      degree: data.degree,
      branch: data.branch,
      year_of_study: data.year_of_study,
      passout_year: data.passout_year ?? data.graduation_year,
      company: data.company,
      designation: data.designation,
      experience: data.experience,
      preferred_role: data.preferred_role,
      skills: data.skills,
      city: data.city,
      state: data.state,
      country: data.country,
      stacks: [...(data.stacks ?? []), ...(data.target_stacks ?? [])],
    }),
    onSuccess: () => {
      toast.success('Account created! Please sign in 🎉');
      router.push(ROUTES.LOGIN);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── Step validation ───────────────────────────────────────────────────────

  const STEP_FIELDS: (keyof FormData)[][] = [
    ['name', 'username', 'email', 'password', 'confirm_password', 'security_question', 'security_answer'],
    ['user_type'],
    [], // details optional
    [], // location optional
    [], // career optional
  ];

  const next = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  };

  const back = () => setStep((s) => s - 1);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] shrink-0 flex-col justify-between p-12 bg-[var(--bg-secondary)] border-r border-[var(--border)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[100px]" />
          <div className="absolute bottom-[10%] left-[-5%] w-[250px] h-[250px] rounded-full bg-emerald-600/8 blur-[80px]" />
        </div>
        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/40">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-[var(--text)]">Career Copilot</span>
        </Link>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-5">
            <Zap size={10} className="fill-current" /> Free forever
          </div>
          <h2 className="text-2xl font-bold text-[var(--text)] mb-3 leading-tight">
            Everything you need<br />to land the job.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed">
            Join thousands of job seekers who use Career Copilot to organize their search and get hired faster.
          </p>
          <div className="space-y-2.5">
            {PERKS.map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />{p}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-[var(--text-secondary)]">© {new Date().getFullYear()} Career Copilot</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                  i === step ? 'bg-[var(--primary)]/10 text-[var(--primary)]' :
                  i < step ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    i === step ? 'bg-[var(--primary)] border-[var(--primary)] text-white' :
                    i < step ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                    'bg-[var(--input)] border-[var(--border)]'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-4 transition-colors ${i < step ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit((d) => mutate(d))}>
            <AnimatePresence mode="wait">

              {/* ── Step 0: Account ── */}
              {step === 0 && (
                <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="mb-2">
                    <h1 className="text-xl font-bold text-[var(--text)]">Create your account</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Start tracking your job applications for free</p>
                  </div>

                  <Input label="Full name" placeholder="Alex Johnson" autoComplete="name"
                    leftElement={<User size={14} />} error={errors.name?.message} required {...register('name')} />

                  {/* Username with live availability */}
                  <div>
                    <Input
                      label="Username"
                      placeholder="e.g. alex_johnson"
                      autoComplete="username"
                      leftElement={<AtSign size={14} />}
                      error={errors.username?.message}
                      required
                      {...register('username', {
                        onChange: (e) => setUsernameInput(e.target.value.toLowerCase()),
                      })}
                    />
                    {/* Availability feedback */}
                    {debouncedUsername.length >= 3 && !errors.username && (
                      <div className="mt-1.5">
                        {usernameCheck?.available === true && (
                          <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={11} /> @{debouncedUsername} is available
                          </p>
                        )}
                        {usernameCheck?.available === false && (
                          <div>
                            <p className="text-xs text-[var(--danger)]">@{debouncedUsername} is already taken</p>
                            {usernameCheck.suggestions.length > 0 && (
                              <div className="flex gap-1.5 mt-1 flex-wrap">
                                <span className="text-xs text-[var(--text-secondary)]">Try:</span>
                                {usernameCheck.suggestions.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => {
                                      setValue('username', s);
                                      setUsernameInput(s);
                                    }}
                                    className="text-xs text-[var(--primary)] hover:underline"
                                  >
                                    @{s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Input label="Email address" type="email" placeholder="you@example.com" autoComplete="email"
                    leftElement={<Mail size={14} />} error={errors.email?.message} required {...register('email')} />

                  <Input label="Password" type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number, symbol" autoComplete="new-password"
                    leftElement={<Lock size={14} />}
                    rightElement={
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="hover:text-[var(--text)] transition-colors">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                    error={errors.password?.message} required {...register('password')} />

                  <Input label="Confirm password" type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password" autoComplete="new-password"
                    leftElement={<Lock size={14} />}
                    rightElement={
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="hover:text-[var(--text)] transition-colors">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                    error={errors.confirm_password?.message} required {...register('confirm_password')} />

                  <Select label="Security question" placeholder="Pick a question"
                    options={SECURITY_QUESTIONS.map(q => ({ value: q, label: q }))}
                    error={errors.security_question?.message} required {...register('security_question')} />

                  <Input label="Security answer" placeholder="Your answer"
                    error={errors.security_answer?.message} required {...register('security_answer')} />

                  <Button type="button" fullWidth size="lg" rightIcon={<ArrowRight size={15} />} onClick={next} className="mt-2">
                    Continue
                  </Button>

                  <p className="text-center text-sm text-[var(--text-secondary)] pt-2">
                    Already have an account?{' '}
                    <Link href={ROUTES.LOGIN} className="text-[var(--primary)] hover:underline font-medium">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* ── Step 1: User type ── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="mb-2">
                    <h1 className="text-xl font-bold text-[var(--text)]">What describes you best?</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">This helps us personalise your experience</p>
                  </div>

                  <Controller control={control} name="user_type" render={({ field }) => (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: 'student', label: 'Student', desc: 'Currently studying or a fresh graduate', icon: <GraduationCap size={22} /> },
                        { value: 'professional', label: 'Working Professional', desc: 'Currently employed or experienced', icon: <Briefcase size={22} /> },
                      ].map((opt) => (
                        <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)}
                          className={`p-5 rounded-xl border-2 text-left transition-all ${
                            field.value === opt.value
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                          }`}>
                          <div className={`mb-3 ${field.value === opt.value ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>{opt.icon}</div>
                          <p className="font-semibold text-[var(--text)] text-sm">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  )} />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" size="lg" leftIcon={<ArrowLeft size={15} />} onClick={back}>Back</Button>
                    <Button type="button" fullWidth size="lg" rightIcon={<ArrowRight size={15} />} onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Details ── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="mb-2">
                    <h1 className="text-xl font-bold text-[var(--text)]">
                      {userType === 'student' ? 'Education details' : 'Work details'}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Optional — you can update this later</p>
                  </div>

                  {userType === 'student' ? (
                    <>
                      <Controller control={control} name="college" render={({ field }) => (
                        <div className="relative">
                          <Combobox
                            label="College / University"
                            placeholder="Search your college…"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            options={colleges}
                            onSearch={setCollegeQuery}
                            onAddNew={async (name) => { try { await collegesApi.add(name); } catch { /* not authed yet, select locally */ } }}
                            loading={loadingColleges}
                            hint="Not found? Type the name and click Add"
                          />
                        </div>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <Controller control={control} name="degree" render={({ field }) => (
                          <Combobox label="Degree" placeholder="B.Tech, M.Sc…"
                            value={field.value ?? ''} onChange={field.onChange} options={DEGREES} />
                        )} />
                        <Controller control={control} name="branch" render={({ field }) => (
                          <Combobox label="Branch / Major" placeholder="Computer Science…"
                            value={field.value ?? ''} onChange={field.onChange} options={BRANCHES} />
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Select label="Year of study" placeholder="Select year"
                          options={YEARS_OF_STUDY.map(y => ({ value: y, label: y }))}
                          {...register('year_of_study')} />
                        <Input label="Passout year" placeholder="2025" type="number"
                          min={2000} max={2035} {...register('passout_year')} />
                      </div>
                    </>
                  ) : (
                    <>
                      <Controller control={control} name="company" render={({ field }) => (
                        <Combobox label="Current company" placeholder="Google, Infosys…"
                          value={field.value ?? ''} onChange={field.onChange} options={COMMON_COMPANIES} allowOther />
                      )} />
                      <Controller control={control} name="designation" render={({ field }) => (
                        <Combobox label="Designation" placeholder="Software Engineer…"
                          value={field.value ?? ''} onChange={field.onChange} options={COMMON_DESIGNATIONS} allowOther />
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="Experience" placeholder="Select"
                          options={EXPERIENCE_OPTIONS.map(e => ({ value: e, label: e }))}
                          {...register('experience')} />
                        <Input label="Graduation year" placeholder="2020" type="number"
                          min={1990} max={2030} {...register('graduation_year')} />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" size="lg" leftIcon={<ArrowLeft size={15} />} onClick={back}>Back</Button>
                    <Button type="button" fullWidth size="lg" rightIcon={<ArrowRight size={15} />} onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Location ── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="mb-2">
                    <h1 className="text-xl font-bold text-[var(--text)]">Where are you based?</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Helps match you with relevant opportunities</p>
                  </div>

                  <Controller control={control} name="country" render={({ field }) => (
                    <Combobox
                      label="Country"
                      placeholder="Select country…"
                      value={field.value ?? ''}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue('state', '');
                        setValue('city', '');
                      }}
                      options={countryNames}
                      allowOther={false}
                    />
                  )} />

                  <Controller control={control} name="state" render={({ field }) => (
                    <Combobox
                      label="State / Province"
                      placeholder={selectedCountryName ? 'Select state…' : 'Select country first'}
                      value={field.value ?? ''}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue('city', '');
                      }}
                      options={stateNames}
                      allowOther={false}
                      disabled={!selectedCountryName || stateNames.length === 0}
                    />
                  )} />

                  <Controller control={control} name="city" render={({ field }) => (
                    <Combobox
                      label="City"
                      placeholder={selectedStateName ? 'Select city…' : 'Select state first'}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={cities}
                      allowOther={true}
                      disabled={!selectedStateName}
                    />
                  )} />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" size="lg" leftIcon={<ArrowLeft size={15} />} onClick={back}>Back</Button>
                    <Button type="button" fullWidth size="lg" rightIcon={<ArrowRight size={15} />} onClick={next}>Continue</Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Career ── */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="mb-2">
                    <h1 className="text-xl font-bold text-[var(--text)]">Career goals</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Optional — helps AI personalise recommendations</p>
                  </div>

                  <Controller control={control} name="preferred_role" render={({ field }) => (
                    <Combobox label="Target role" placeholder="e.g. Frontend Engineer…"
                      value={field.value ?? ''} onChange={field.onChange} options={COMMON_ROLES} allowOther />
                  )} />

                  <Input label="Skills (optional)" placeholder="React, Python, SQL… (comma separated)"
                    hint="Add your key skills" {...register('skills')} />

                  {userType === 'professional' && (
                    <Controller control={control} name="stacks" render={({ field }) => (
                      <MultiCombobox
                        label="Tech stacks you've worked with"
                        placeholder="Search stacks…"
                        values={field.value ?? []}
                        onChange={field.onChange}
                        options={allStacks}
                        onAddNew={async (name) => { try { await stacksApi.add(name); } catch { /* not authed yet, select locally */ } }}
                        hint="Select all that apply"
                        max={10}
                      />
                    )} />
                  )}

                  <Controller control={control} name="target_stacks" render={({ field }) => (
                    <MultiCombobox
                      label="Target tech stacks / job type"
                      placeholder="Search stacks…"
                      values={field.value ?? []}
                      onChange={field.onChange}
                      options={allStacks}
                      onAddNew={async (name) => { try { await stacksApi.add(name); } catch { /* not authed yet, select locally */ } }}
                      hint="What kind of roles are you targeting?"
                      max={10}
                    />
                  )} />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="secondary" size="lg" leftIcon={<ArrowLeft size={15} />} onClick={back}>Back</Button>
                    <Button type="submit" fullWidth size="lg" loading={isPending}>
                      Create account 🎉
                    </Button>
                  </div>

                  <p className="text-center text-xs text-[var(--text-secondary)]">
                    By creating an account you agree to our Terms of Service
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  );
}
