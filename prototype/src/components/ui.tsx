import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleAlert,
  Info,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import type { Tone } from "../types";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props} />
  );
}

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

const bannerIcons = {
  neutral: Info,
  info: Info,
  success: Check,
  warning: AlertTriangle,
  danger: XCircle,
};

export function Banner({
  title,
  children,
  tone = "info",
  action,
}: {
  title: string;
  children?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
}) {
  const Icon = bannerIcons[tone];
  return (
    <div
      className={`banner banner--${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon size={18} aria-hidden="true" />
      <div className="banner__content">
        <strong>{title}</strong>
        {children && <span>{children}</span>}
      </div>
      {action && <div className="banner__action">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "empty",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: "empty" | "error" | "loading";
}) {
  const Icon =
    icon === "error" ? CircleAlert : icon === "loading" ? LoaderCircle : Info;
  return (
    <div className="empty-state">
      <span
        className={`empty-state__icon ${icon === "loading" ? "is-spinning" : ""}`}
      >
        <Icon size={24} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className={`metric metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <div className="progress" aria-label={label}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ListLink({
  title,
  meta,
  onClick,
  trailing,
}: {
  title: string;
  meta?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <button className="list-link" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        {meta && <small>{meta}</small>}
      </span>
      {trailing ?? <ChevronRight size={17} />}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  children,
  confirmLabel = "确认",
  onConfirm,
  onCancel,
  danger = false,
  confirmDisabled = false,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title">{title}</h2>
        <div className="modal__body">{children}</div>
        <div className="modal__actions">
          <Button variant="secondary" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
