"use client";

import { useState } from "react";
import {
  EVENT_KINDS,
  EVENT_LABELS,
  SEAT_LABELS,
  type SeatType,
} from "@rw/core/domain";
import { formatPriceByn } from "@rw/core/format";
import type { TrainInfo } from "@rw/core/rw-types";
import { Button, Field, Input, Notice, PageHeader, Plate, Section } from "./ui";
import { SubmitButton } from "./form-controls";

type FormAction = (formData: FormData) => void | Promise<void>;

export function RouteSearchPanel({
  action,
  compact,
  from,
  to,
  date,
}: {
  action: FormAction;
  compact: boolean;
  from: string;
  to: string;
  date: string;
}) {
  const [expanded, setExpanded] = useState(!compact);

  if (compact && !expanded) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-y border-foreground py-4">
        <p className="text-lg font-medium tracking-tight">
          {from} <span aria-hidden="true">→</span> {to}
          <span className="ml-4 font-mono text-xs font-normal text-muted">{date}</span>
        </p>
        <Button size="sm" variant="ghost" onClick={() => setExpanded(true)}>
          Изменить
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-foreground pt-5">
      <form
        action={action}
        className="grid gap-4 sm:grid-cols-[1fr_1fr_0.8fr_auto] sm:items-end"
      >
        <Field label="Откуда">
          <Input name="from" defaultValue={from} required placeholder="Минск-Пассажирский" autoComplete="off" />
        </Field>
        <Field label="Куда">
          <Input name="to" defaultValue={to} required placeholder="Гродно" autoComplete="off" />
        </Field>
        <Field label="Дата">
          <Input name="date" type="date" defaultValue={date} required />
        </Field>
        <SubmitButton>Найти поезда</SubmitButton>
      </form>
      <p className="mt-3 text-xs text-muted">
        Названия станций как на pass.rw.by, например «Минск-Пассажирский».
      </p>
      {compact ? (
        <div className="mt-4">
          <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
            Свернуть
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const eventDescriptions: Record<(typeof EVENT_KINDS)[number], string> = {
  appeared: "места появились выше порога",
  increased: "количество мест выросло",
  decreased: "количество мест уменьшилось",
  soldOut: "места закончились (подтверждается повторной проверкой)",
};

function seatOptionKey(trainNumber: string, seatType: SeatType) {
  return `${trainNumber}|${seatType}`;
}

export function TrackerWizard({
  action,
  trains,
  from,
  to,
  date,
  defaultIntervalSec,
}: {
  action: FormAction;
  trains: TrainInfo[];
  from: string;
  to: string;
  date: string;
  defaultIntervalSec: number;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showSelectionError, setShowSelectionError] = useState(false);
  const selectedTrainCount = new Set(
    [...selected].map((value) => value.split("|")[0]),
  ).size;
  const trainPayload = trains.map(({ number, routeTitle, departure, arrival }) => ({
    number,
    routeTitle,
    departure,
    arrival,
  }));

  function toggleSeat(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setShowSelectionError(false);
  }

  function continueToSettings() {
    if (selected.size === 0) {
      setShowSelectionError(true);
      return;
    }
    setStep(2);
  }

  return (
    <form action={action} className="space-y-10">
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="trains" value={JSON.stringify(trainPayload)} />

      <ol aria-label="Этапы" className="flex gap-8 font-mono text-xs">
        {[
          { n: "01", label: "Поезда и места", active: step === 1 },
          { n: "02", label: "Условия", active: step === 2 },
        ].map((item) => (
          <li
            key={item.n}
            aria-current={item.active ? "step" : undefined}
            className={`border-b-[3px] pb-2 ${item.active ? "border-accent text-foreground" : "border-transparent text-muted"}`}
          >
            <span className="mr-2">{item.n}</span>
            {item.label}
          </li>
        ))}
      </ol>

      <div hidden={step !== 1} className="space-y-10">
        {trains.map((train) => {
          const options = [
            {
              seatType: "any" as SeatType,
              count: train.seats.reduce((total, seat) => total + seat.count, 0),
              price: null as number | null,
              note: "любая категория",
            },
            ...train.seats.map((seat) => ({
              seatType: seat.seatType,
              count: seat.count,
              price: seat.priceByn,
              note: seat.priceByn !== null ? formatPriceByn(seat.priceByn) : "цена не указана",
            })),
          ];

          return (
            <Section
              key={train.number}
              title={train.routeTitle}
              meta={
                train.departure && train.arrival
                  ? `${train.departure} → ${train.arrival}`
                  : undefined
              }
            >
              <div className="mb-4 flex items-center gap-3">
                <Plate>{train.number}</Plate>
                {!train.sellingAllowed ? (
                  <span className="text-xs text-warn">продажа закрыта</span>
                ) : null}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
                {options.map((option) => {
                  const key = seatOptionKey(train.number, option.seatType);
                  const checked = selected.has(key);
                  return (
                    <label
                      key={option.seatType}
                      className={`block cursor-pointer rounded-ui border px-3 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground ${
                        checked
                          ? "border-foreground bg-accent text-accent-foreground"
                          : "border-rule-strong hover:border-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="seats"
                        value={key}
                        checked={checked}
                        onChange={() => toggleSeat(key)}
                        className="sr-only"
                      />
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{SEAT_LABELS[option.seatType]}</span>
                        <span className="font-mono text-base">{option.count}</span>
                      </span>
                      <span className={`mt-1 block truncate font-mono text-xs ${checked ? "opacity-80" : "text-muted"}`}>
                        {option.note}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Section>
          );
        })}
        {showSelectionError ? (
          <Notice tone="warn" role="alert">
            Отметьте хотя бы один тип мест.
          </Notice>
        ) : null}
      </div>

      <div hidden={step !== 2} className="space-y-10">
        <PageHeader
          title="Условия"
          description={`Поездов выбрано: ${selectedTrainCount}. Изменить условия позже можно, только создав трекер заново.`}
        />
        <div className="grid gap-5 border-t border-foreground pt-5 sm:grid-cols-2">
          <Field label="Порог мест" hint="Сообщать, когда мест станет не меньше.">
            <Input name="minSeats" type="number" min={1} defaultValue={1} required />
          </Field>
          <Field label="Интервал проверки, с" hint="Не меньше 60 секунд.">
            <Input name="intervalSec" type="number" min={60} defaultValue={defaultIntervalSec} required />
          </Field>
        </div>
        <fieldset className="border-t border-foreground pt-5">
          <legend className="sr-only">О каких изменениях сообщать</legend>
          <p className="mb-2 text-sm font-semibold">О каких изменениях сообщать</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {EVENT_KINDS.map((kind) => (
              <li key={kind}>
                <label className="flex cursor-pointer items-start gap-4 py-3">
                  <input
                    type="checkbox"
                    name="notifyOn"
                    value={kind}
                    defaultChecked
                    className="mt-1 size-4 shrink-0 accent-foreground"
                  />
                  <span>
                    <span className="block text-sm">{EVENT_LABELS[kind]}</span>
                    <span className="block text-xs text-muted">{eventDescriptions[kind]}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-foreground bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:bottom-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {step === 1 ? (
            <p className="font-mono text-xs text-muted">
              выбрано: {selected.size}
              {selected.size > 0 ? ` · поездов: ${selectedTrainCount}` : ""}
            </p>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Назад
            </Button>
          )}
          {step === 1 ? (
            <Button type="button" variant="primary" disabled={selected.size === 0} onClick={continueToSettings}>
              Далее
            </Button>
          ) : (
            <SubmitButton>Создать {selectedTrainCount === 1 ? "трекер" : "трекеры"}</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
