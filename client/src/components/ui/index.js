'use client';
import { motion } from 'framer-motion';

export function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function InputField({ label, type = 'text', value, onChange, placeholder, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-medium text-[var(--muted)]">{label}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className={`w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border text-[var(--text)] outline-none transition-colors placeholder:text-[var(--muted)] placeholder:opacity-60 focus:border-[var(--accent)] disabled:opacity-50 ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`}
        {...props}
      />
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  );
}

export function SelectDropdown({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-medium text-[var(--muted)]">{label}</label>}
      <select value={value} onChange={onChange} className="w-full h-[42px] px-3.5 text-sm rounded-[10px] bg-[var(--input)] border border-[var(--border)] text-[var(--text)] outline-none cursor-pointer appearance-none focus:border-[var(--accent)]">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>)}
      </select>
    </div>
  );
}

export function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  const v = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-h)]',
    secondary: 'bg-[var(--input)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)]',
    ghost: 'text-[var(--muted)] hover:text-[var(--text)]',
    danger: 'text-[var(--danger)] border border-[var(--danger)] hover:bg-[var(--danger)] hover:text-white',
  };
  return (
    <button disabled={loading || props.disabled} className={`inline-flex items-center justify-center gap-2 h-[42px] px-5 rounded-[10px] text-sm font-medium cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v[variant] || v.primary} ${className}`} {...props}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner() {
  return <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>;
}

export function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[480px] max-h-[90vh] overflow-y-auto p-6 rounded-[14px] bg-[var(--card)] border border-[var(--border)]">
        {title && <div className="flex justify-between items-center mb-5 pb-4 border-b border-[var(--border)]"><h3 className="text-base font-semibold">{title}</h3><button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--input)] text-[var(--muted)] cursor-pointer text-sm">✕</button></div>}
        {children}
      </div>
    </div>
  );
}

export function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all ${active ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--input)]'}`}>
      <span className="text-[15px] w-5 text-center">{icon}</span>
      {label && <span>{label}</span>}
    </button>
  );
}
