import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes safely, resolving conflicts via tailwind-merge.
 * This is the single utility used across every component for className composition.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
