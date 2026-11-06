import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-foreground bg-accent text-accent-foreground hover:bg-foreground hover:text-background",
  secondary:
    "border border-foreground text-foreground hover:bg-foreground hover:text-background",
  ghost:
    "border border-transparent text-muted underline-offset-4 hover:text-foreground hover:underline",
  danger:
    "border border-danger text-danger hover:bg-danger hover:text-background",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 text-xs",
  md: "min-h-11 px-5 text-sm",
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-ui font-medium tracking-wide transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-balance text-[2rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-pretty text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Section({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-4 border-t border-foreground pt-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meta ? (
          <div className="font-mono text-xs text-muted">{meta}</div>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

type Tone = "neutral" | "ok" | "warn" | "danger";

const noticeRule: Record<Tone, string> = {
  neutral: "border-rule-strong",
  ok: "border-ok",
  warn: "border-warn",
  danger: "border-danger",
};

/** A plain sentence with a coloured rule; deliberately no icon, fill or title. */
export function Notice({
  tone = "neutral",
  role = "status",
  children,
}: {
  tone?: Tone;
  role?: "status" | "alert";
  children: ReactNode;
}) {
  return (
    <p
      role={role}
      className={`border-l-[3px] py-0.5 pl-4 text-sm leading-relaxed ${noticeRule[tone]}`}
    >
      {children}
    </p>
  );
}

/** Train number as a small signage plate. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-ui border border-foreground px-1.5 font-mono text-xs font-semibold leading-none">
      {children}
    </span>
  );
}

type StatusTone = "ok" | "warn" | "danger" | "idle";

const statusMarker: Record<StatusTone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  idle: "border border-subtle",
};

export function Status({
  tone,
  pulse = false,
  title,
  children,
}: {
  tone: StatusTone;
  pulse?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs text-muted"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 ${statusMarker[tone]} ${pulse ? "animate-pulse" : ""}`}
      />
      {children}
    </span>
  );
}

export type FigureTone = "hit" | "low" | "none" | "unknown";

const figureValue: Record<FigureTone, string> = {
  hit: "bg-accent px-1.5 text-accent-foreground",
  low: "text-warn",
  none: "text-muted",
  unknown: "text-subtle",
};

/** A big monospace number with a quiet label, like a column on a departure board. */
export function Figure({
  label,
  value,
  detail,
  tone = "none",
  size = "lg",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: FigureTone;
  size?: "md" | "lg";
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <p
        className={`mt-2 font-mono leading-none ${size === "lg" ? "text-4xl" : "text-2xl sm:text-4xl"}`}
      >
        <span className={figureValue[tone]}>{value}</span>
      </p>
      <p className="mt-2 min-h-4 truncate font-mono text-xs text-muted">
        {detail}
      </p>
    </div>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-ui border border-dashed border-rule-strong px-6 py-16 text-center">
      <h2 className="text-balance text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse bg-rule ${className}`} />
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClassName =
  "min-h-11 w-full rounded-ui border border-rule-strong bg-transparent px-3 text-sm text-foreground placeholder:text-subtle hover:border-foreground focus:border-foreground disabled:text-muted";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClassName} ${className}`} {...props} />;
}

export function TextLink({
  href,
  children,
  className = "",
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={`underline decoration-rule-strong underline-offset-4 hover:decoration-foreground ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
