"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./ui";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={`relative ${className}`}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {/* Content stays in the layout so the button never changes size while pending. */}
      <span className={pending ? "invisible contents" : "contents"}>
        {children}
      </span>
      {pending ? (
        <span
          aria-hidden="true"
          className="absolute animate-pulse font-mono tracking-[0.3em]"
        >
          ···
        </span>
      ) : null}
    </Button>
  );
}

export function ConfirmSubmitButton({
  children,
  prompt,
  confirmLabel = "Да, удалить",
}: {
  children: React.ReactNode;
  prompt: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();

  if (confirming) {
    return (
      <span
        role="group"
        aria-label="Подтверждение"
        className="flex flex-wrap items-center gap-3"
      >
        <span className="text-xs text-danger">{prompt}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(false)}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="danger"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Удаляем" : confirmLabel}
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="danger"
      onClick={() => setConfirming(true)}
    >
      {children}
    </Button>
  );
}
