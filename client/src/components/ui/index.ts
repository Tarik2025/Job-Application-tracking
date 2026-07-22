/**
 * Design system barrel export.
 * Import all UI components from '@/components/ui'.
 *
 * Never import directly from individual files in feature code —
 * always use this barrel to maintain a stable public API.
 */

// Button + Spinner
export { Button, Spinner } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Form elements
export {
  Label,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
} from './FormElements';
export type {
  LabelProps,
  InputProps,
  TextareaProps,
  SelectProps,
  SelectOption,
  CheckboxProps,
  SwitchProps,
} from './FormElements';

// Badges + Tags + Avatar
export {
  Badge,
  StatusBadge,
  PriorityBadge,
  Tag,
  Avatar,
} from './Badge';
export type { BadgeProps, BadgeVariant, TagProps, AvatarProps } from './Badge';

// Modal + Sheet + ConfirmDialog
export { Modal, ConfirmDialog, Sheet } from './Modal';
export type {
  ModalProps,
  ConfirmDialogProps,
  SheetProps,
} from './Modal';

// Card + Skeleton + States + Alert + Divider + Pagination
export {
  Card,
  StatCard,
  Skeleton,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Alert,
  Divider,
  Pagination,
} from './Card';
export type {
  CardProps,
  StatCardProps,
  SkeletonProps,
  EmptyStateProps,
  ErrorStateProps,
  AlertProps,
  AlertVariant,
  PaginationProps,
} from './Card';

// Command Palette + Search
export { CommandPalette, SearchBar } from './CommandPalette';
export type { CommandPaletteProps, SearchBarProps } from './CommandPalette';

// Tooltip + Popover + ActionMenu
export { Tooltip, Popover, ActionMenu } from './Tooltip';
export type {
  TooltipProps,
  PopoverProps,
  ActionMenuProps,
  ActionMenuItem,
} from './Tooltip';

// Combobox (single + multi)
export { Combobox, MultiCombobox } from './Combobox';
export type { ComboboxProps, MultiComboboxProps } from './Combobox';
