import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!env.APP_PASSWORD) redirect("/");
  const { error } = await searchParams;

  return (
    <form action={loginAction} className="mx-auto mt-16 flex max-w-xs flex-col gap-3">
      <h1 className="text-xl font-semibold">Вход</h1>
      <input
        name="password"
        type="password"
        required
        autoFocus
        placeholder="Пароль"
        className="rounded border border-black/20 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
      />
      {error ? <p className="text-sm text-red-600">Неверный пароль</p> : null}
      <button type="submit" className="rounded bg-foreground px-4 py-1.5 text-sm text-background">
        Войти
      </button>
    </form>
  );
}
