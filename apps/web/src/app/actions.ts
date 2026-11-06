"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth";
import { env } from "@/lib/env";
import { broadcast } from "@rw/core/telegram";
import { trackerInputSchema } from "@/lib/tracker-input";
import {
  createRouteSearch,
  createTrackers,
  deleteTracker,
  listTrackers,
  requestCheck,
  setTrackerActive,
} from "@rw/db/trackers";
import { addRecipient, listRecipientIds, removeRecipient } from "@rw/db/recipients";

const idSchema = z.coerce.number().int().positive();

const recipientSchema = z.object({
  chatId: idSchema,
  label: z.string().trim().max(64),
});

const trainsSchema = z.array(
  z.object({
    number: z.string().min(1),
    routeTitle: z.string(),
    departure: z.string().nullable(),
    arrival: z.string().nullable(),
  }),
);

function refreshTracker(id: number) {
  revalidatePath("/");
  revalidatePath(`/trackers/${id}`);
}

export async function createTrackersAction(formData: FormData) {
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const date = String(formData.get("date") ?? "");
  const selections = formData.getAll("seats").map((value) => String(value).split("|"));
  const trains = trainsSchema.parse(JSON.parse(String(formData.get("trains") ?? "[]")));

  const inputs = trains.flatMap((train) => {
    const seatTypes = selections
      .filter(([number]) => number === train.number)
      .map(([, seatType]) => seatType);
    if (seatTypes.length === 0) return [];

    return [
      trackerInputSchema.parse({
        fromName: from,
        toName: to,
        date,
        trainNumber: train.number,
        trainTitle: train.routeTitle,
        departure: train.departure,
        arrival: train.arrival,
        seatTypes,
        minSeats: Number(formData.get("minSeats") ?? 1),
        notifyOn: formData.getAll("notifyOn"),
        intervalSec: Number(formData.get("intervalSec") ?? env.DEFAULT_INTERVAL_SEC),
      }),
    ];
  });

  if (inputs.length === 0) {
    redirect(`/trackers/new?${new URLSearchParams({ from, to, date, error: "none" })}`);
  }

  await createTrackers(inputs);
  revalidatePath("/");
  redirect("/");
}

export async function setActiveAction(formData: FormData) {
  const id = idSchema.parse(formData.get("id"));
  await setTrackerActive(id, formData.get("active") === "true");
  refreshTracker(id);
}

export async function requestCheckAction(formData: FormData) {
  const raw = String(formData.get("id"));
  const trackerList = await listTrackers();
  const ids = raw === "all" ? trackerList.map((tracker) => tracker.id) : [idSchema.parse(raw)];
  await requestCheck(ids);
  revalidatePath("/");
}

export async function deleteTrackerAction(formData: FormData) {
  await deleteTracker(idSchema.parse(formData.get("id")));
  revalidatePath("/");
  redirect("/");
}

export async function sendTestAction() {
  const recipientIds = await listRecipientIds();
  let query: URLSearchParams;
  if (recipientIds.length === 0) {
    query = new URLSearchParams({ test: "none" });
  } else {
    try {
      const { sent, failed } = await broadcast(recipientIds, "Тест: уведомления работают ✅");
      const status = failed.length === 0 ? "ok" : sent.length > 0 ? "partial" : "error";
      query = new URLSearchParams({ test: status, sent: String(sent.length), failed: String(failed.length) });
    } catch {
      query = new URLSearchParams({ test: "error" });
    }
  }
  redirect(`/settings?${query}`);
}

export async function addRecipientAction(formData: FormData) {
  const { chatId, label } = recipientSchema.parse({
    chatId: formData.get("chatId"),
    label: String(formData.get("label") ?? ""),
  });
  await addRecipient(chatId, label || null);
  revalidatePath("/settings");
}

export async function removeRecipientAction(formData: FormData) {
  await removeRecipient(idSchema.parse(formData.get("chatId")));
  revalidatePath("/settings");
}

export async function loginAction(formData: FormData) {
  const token = sessionToken();
  if (!token) redirect("/");

  if (formData.get("password") !== env.APP_PASSWORD) {
    redirect("/login?error=1");
  }

  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}

export async function searchRouteAction(formData: FormData) {
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  if (!from || !to || !date) {
    redirect("/trackers/new");
  }

  const id = await createRouteSearch(from, to, date);
  redirect(`/trackers/new?search=${id}`);
}
