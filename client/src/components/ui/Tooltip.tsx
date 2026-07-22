'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 400,
  className,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  const positionStyles: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            role="tooltip"
            className={cn(
              'absolute z-50 px-2.5 py-1.5 text-xs font-medium',
              'bg-[var(--text)] text-[var(--bg)] rounded-md shadow-lg',
              'whitespace-nowrap pointer-events-none',
              positionStyles[side],
              className,
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────

export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  className,
}: PopoverProps) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const positionStyles: Record<string, string> = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const alignStyles: Record<string, string> = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <div ref={ref} className="relative inline-flex">
      {React.cloneElement(trigger, {
        onClick: () => setOpen((prev) => !prev),
      } as React.HTMLAttributes<HTMLElement>)}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: side === 'bottom' ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 min-w-[160px]',
              'bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl',
              positionStyles[side],
              alignStyles[align],
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  separator?: boolean;
}

export interface ActionMenuProps {
  trigger: React.ReactElement;
  items: ActionMenuItem[];
  align?: 'start' | 'end';
}

export function ActionMenu({ trigger, items, align = 'end' }: ActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="relative inline-flex">
      {React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        },
      } as React.HTMLAttributes<HTMLElement>)}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute top-full mt-1 z-50 min-w-[160px] py-1',
              'bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl',
              align === 'end' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) => (
              <React.Fragment key={i}>
                {item.separator && i > 0 && (
                  <div className="my-1 h-px bg-[var(--border)]" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onClick();
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm',
                    'transition-colors cursor-pointer text-left',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    item.variant === 'danger'
                      ? 'text-[var(--danger)] hover:bg-[var(--danger)]/8'
                      : 'text-[var(--text)] hover:bg-[var(--input)]',
                  )}
                >
                  {item.icon && (
                    <span className="shrink-0 text-current opacity-70">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
