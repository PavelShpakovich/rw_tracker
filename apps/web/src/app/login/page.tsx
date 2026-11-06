import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { loginAction } from "../actions";
import { SubmitButton } from "@/components/form-controls";
import { Field, Input, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!env.APP_PASSWORD) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-16">
      <h1 className="text-4xl font-semibold tracking-tight">Вход</h1>
      <form action={loginAction} className="mt-8 space-y-5 border-t border-foreground pt-6">
        <Field label="Пароль">
          <Input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
          />
        </Field>
        {error ? <Notice tone="danger" role="alert">Неверный пароль.</Notice> : null}
        <SubmitButton className="w-full">Войти</SubmitButton>
      </form>
    </div>
  );
}
