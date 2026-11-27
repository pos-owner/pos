import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invalidate, useApi } from "../../lib/api";
import { nextDueDate } from "../../lib/dates";
import {
  dateLabel,
  daysFromToday,
  firstName,
  greeting,
  longToday,
  monthLabel,
  ordinal,
  rupees,
} from "../../lib/format";
import { telLink, whatsappLink } from "../../lib/links";
import type { LedgerRow, TenantHome as TenantHomeData } from "../../lib/types";
import { Empty, ErrorState, Page, Row, Section, SkeletonPage, StatusPill } from "../../components/kit";
import { I } from "../../components/icons";
import { InstallCard } from "../../components/InstallCard";
import { Bell } from "../../components/Bell";
import { OutboxButton } from "../../components/OutboxButton";
import { PaySheet, readUpiReturn } from "./PaySheet";
import { MultiPaySheet } from "../shared/MultiPaySheet";
import "../../styles/tenant.css";

export default function TenantHome() {
  const { data, error, loading, reload } = useApi<TenantHomeData>("/api/tenant/home");
  const [paying, setPaying] = useState<LedgerRow | null>(null);
  const [returned, setReturned] = useState(false);
  const [multi, setMulti] = useState(false);
  const nav = useNavigate();

  // Back from the UPI app (even if the phone reloaded pOS meanwhile): reopen Pay and ask how it went.
  useEffect(() => {
    if (!data) return;
    const id = readUpiReturn();
    const c = id ? data.outstanding.find((x) => x.id === id && x.pending === 0) : undefined;
    if (c) {
      setReturned(true);
      setPaying(c);
    }
  }, [!!data]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The latest confirmed payment: a small "you're on track" line under the amount. */
  const lastPaid = useMemo(() => {
    let best: { amount: number; paidOn: string } | null = null;
    for (const r of data?.ledger ?? [])
      for (const p of r.payments)
        if (p.status === "confirmed" && (!best || p.paidOn > best.paidOn))
          best = { amount: p.amount, paidOn: p.paidOn };
    return best;
  }, [data]);

  const name = firstName(data?.tenant?.fullName ?? "");
  const title = name ? `${greeting()}, ${name}` : greeting();

  if (loading)
    return (
      <Page title="Home" eyebrow={longToday()}>
        <SkeletonPage />
      </Page>
    );
  if (error || !data)
    return (
      <Page title="Home">
        <ErrorState error={error ?? { message: "Couldn't load your rent." }} retry={reload} />
      </Page>
    );

  const { outstanding, tenancy, unit, property, payee } = data;
  const main = outstanding[0];
  const others = outstanding.slice(1);
  const overdue = outstanding.filter((c) => c.overdue);
  const overdueTotal = overdue.reduce((s, c) => s + c.balance, 0);
  const totalDue = outstanding.reduce((s, c) => s + c.balance, 0);
  const owner = payee.name ? firstName(payee.name) : "your owner";
  const ahead = data.advance ?? [];
  const canMulti = !!tenancy && tenancy.status === "active";

  return (
    <Page
      title={title}
      eyebrow={[unit?.label, property?.name].filter(Boolean).join(" · ") || longToday()}
      right={
        <>
          <OutboxButton />
          <Bell />
        </>
      }
    >
      {!tenancy ? (
        <Section>
          <div className="card">
            <Empty
              icon="key"
              title="No active tenancy"
              text={`${payee.name || "Your owner"} hasn't linked a unit to your account yet. Once they do, your rent and due dates appear here.`}
            />
          </div>
        </Section>
      ) : (
        <>
          {overdue.length > 0 && (
            <Section>
              <div className="banner" role="alert">
                <I.alert />
                <div className="grow">
                  <b>{rupees(overdueTotal)} overdue</b>
                  <span>
                    {overdue.length === 1
                      ? `Rent for ${monthLabel(overdue[0].month, true)} was due on ${dateLabel(overdue[0].dueDate)}.`
                      : `${overdue.length} months are past their due date.`}
                  </span>
                </div>
              </div>
            </Section>
          )}

          {main ? (
            <Section>
              <div className={`hero due-hero ${main.overdue ? "is-overdue" : ""}`}>
                <div className="between">
                  <span className="t-sub w6 due-k">{monthLabel(main.month, true)} rent</span>
                  <StatusPill status={main.status} />
                </div>
                <div className="amount mt8 money">{rupees(main.balance)}</div>
                <div className="due-facts">
                  <div>
                    <div className="k">{main.overdue ? "Was due" : "Due"}</div>
                    <div className={`v ${main.overdue ? "c-red" : ""}`}>
                      {dateLabel(main.dueDate)}
                      <span className="t-foot c2" style={{ display: "block", fontWeight: 500 }}>
                        {dueShort(main)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="k">Includes</div>
                    <div className="v">
                      {(main.extra ?? 0) > 0 ? "Rent + meter" : "Rent"}
                      <span className="t-foot c2" style={{ display: "block", fontWeight: 500 }}>
                        {(main.extra ?? 0) > 0
                          ? `${rupees(main.extra)} meter bill`
                          : main.paid > 0
                            ? `${rupees(main.paid)} already paid`
                            : `${rupees(main.amount)} this month`}
                      </span>
                    </div>
                  </div>
                </div>
                {main.pending > 0 ? (
                  <div className="banner purple mt16">
                    <I.clock />
                    <div className="grow">
                      <b>Waiting for {owner} to confirm</b>
                      <span>
                        You marked {rupees(main.pending)} as paid. Owners usually confirm within a day; it shows here as
                        soon as they do.
                      </span>
                    </div>
                    {payee.phone && (
                      <a
                        className="btn sm whatsapp"
                        href={whatsappLink(
                          payee.phone,
                          `Hi ${owner}, I've paid ${rupees(main.pending)} rent for ${unit?.label ?? "my unit"} (${monthLabel(main.month, true)}) and marked it in pOS. Could you confirm when you get a moment? Thank you!`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: "none" }}
                      >
                        <I.chat /> Message
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <button className="btn mt16 pay-btn" onClick={() => setPaying(main)}>
                      Pay {rupees(main.balance)}
                    </button>
                    {canMulti && (
                      <button type="button" className="pay-ahead-link" onClick={() => setMulti(true)}>
                        {others.length
                          ? `Pay all ${outstanding.length} months or pay ahead`
                          : "Pay several months at once"}
                      </button>
                    )}
                  </>
                )}
                {lastPaid && (
                  <div className="confidence">
                    <I.checkCircle /> Last payment {rupees(lastPaid.amount)} on {dateLabel(lastPaid.paidOn, true)}
                  </div>
                )}
              </div>
            </Section>
          ) : (
            <Section>
              <div className="hero paid-hero center-text">
                <div className="paid-check">
                  <I.check />
                </div>
                <div className="t-title2 mt12">You're all paid up</div>
                <div className="t-sub c2" style={{ marginTop: 4 }}>
                  {ahead.length
                    ? `Rent is covered ahead. Next ${rupees(tenancy.rent)} is due after ${monthLabel(ahead[ahead.length - 1].month, true)}.`
                    : `Next rent of ${rupees(tenancy.rent)} is due ${dateLabel(nextDueDate(data.today, tenancy.dueDay), true)}.`}
                </div>
                {canMulti && (
                  <button className="btn tinted md mt16" onClick={() => setMulti(true)}>
                    <I.calendar /> Pay rent ahead
                  </button>
                )}
              </div>
            </Section>
          )}

          {ahead.length > 0 && <PaidAhead rows={ahead} owner={owner} />}

          {others.length > 0 && (
            <Section title="Other dues" action={<span className="t-sub c2 num">{rupees(totalDue)} total</span>}>
              <div className="list">
                {others.map((c) => (
                  <Row
                    key={c.id}
                    title={monthLabel(c.month, true)}
                    sub={dueText(c)}
                    end={
                      <span className="stack">
                        <span className="num w6">{rupees(c.balance)}</span>
                        <StatusPill status={c.status} />
                      </span>
                    }
                    chevron={c.pending === 0}
                    onClick={c.pending === 0 ? () => setPaying(c) : undefined}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section>
            <div className="actions">
              <button className="action" onClick={() => nav("/requests?new=1")}>
                <I.wrench /> Report a problem
              </button>
              {payee.phone && (
                <a
                  className="action"
                  href={whatsappLink(
                    payee.phone,
                    `Hi ${owner}, this is ${data.tenant?.fullName ?? "your tenant"} from ${unit?.label ?? "your property"}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <I.chat /> Message
                </a>
              )}
              {payee.phone && (
                <a className="action" href={telLink(payee.phone)}>
                  <I.phone /> Call
                </a>
              )}
              <button className="action" onClick={() => nav("/history")}>
                <I.clock /> History
              </button>
            </div>
          </Section>

          <Section title="Your tenancy">
            <div className="list icons">
              <Row
                icon="rupee"
                iconBg="var(--green)"
                title="Monthly rent"
                value={<span className="num">{rupees(tenancy.rent)}</span>}
              />
              <Row
                icon="calendar"
                iconBg="var(--orange)"
                title="Due every month"
                value={`${ordinal(tenancy.dueDay)}`}
              />
              <Row
                icon="key"
                iconBg="var(--indigo)"
                title="Lease"
                value={tenancy.endDate ? `Ends ${dateLabel(tenancy.endDate, true)}` : "Ongoing"}
                sub={
                  tenancy.endDate && daysFromToday(tenancy.endDate) <= 60 && daysFromToday(tenancy.endDate) >= 0
                    ? `${daysFromToday(tenancy.endDate)} days left`
                    : undefined
                }
              />
            </div>
          </Section>
        </>
      )}

      <InstallCard />

      <MultiPaySheet
        tenancyId={multi && tenancy ? tenancy.id : null}
        role="tenant"
        unitLabel={unit?.label ?? ""}
        tenantName={data.tenant?.fullName ?? ""}
        onClose={() => setMulti(false)}
        onRecorded={() => invalidate("/api/tenant")}
      />

      <PaySheet
        charge={paying}
        payee={payee}
        returned={returned}
        tenantName={data.tenant?.fullName ?? ""}
        onClose={() => {
          setPaying(null);
          setReturned(false);
        }}
      />
    </Page>
  );
}

function dueShort(c: LedgerRow) {
  const d = daysFromToday(c.dueDate);
  if (c.overdue) return `${-d} ${-d === 1 ? "day" : "days"} late`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return d > 0 ? `In ${d} days` : "";
}

function dueText(c: LedgerRow) {
  const d = daysFromToday(c.dueDate);
  if (c.overdue) return `Was due ${dateLabel(c.dueDate)} · ${-d} ${-d === 1 ? "day" : "days"} late`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d > 0) return `Due ${dateLabel(c.dueDate)} · in ${d} days`;
  return `Due ${dateLabel(c.dueDate)}`;
}

/** Upcoming months that already have money on them: "Paid through Mar 2027". */
function PaidAhead({ rows, owner }: { rows: LedgerRow[]; owner: string }) {
  const cleared = rows.filter((r) => r.balance === 0);
  const through = cleared.length ? cleared[cleared.length - 1].month : null;
  const total = rows.reduce((s, r) => s + r.paid + r.pending, 0);
  const waiting = rows.some((r) => r.pending > 0);
  return (
    <Section title="Paid ahead">
      <div className="ahead-card">
        <div className="ahead-top">
          <span className="ahead-ic">
            <I.calendar />
          </span>
          <span className="grow">
            <span className="t-headline" style={{ display: "block" }}>
              {through ? `Paid through ${monthLabel(through, true)}` : `${rupees(total)} paid ahead`}
            </span>
            <span className="t-sub c2" style={{ display: "block" }}>
              {waiting
                ? `${rupees(total)} for ${rows.length} upcoming ${rows.length === 1 ? "month" : "months"} · waiting for ${owner} to confirm part of it`
                : `${rupees(total)} for ${rows.length} upcoming ${rows.length === 1 ? "month" : "months"}`}
            </span>
          </span>
        </div>
        <div className="ahead-months" aria-label="Months paid ahead">
          {rows.map((r) => (
            <span
              key={r.id}
              className={`am ${r.pending > 0 ? "wait" : r.balance > 0 ? "part" : ""}`}
              title={r.balance > 0 ? `${rupees(r.balance)} left` : "Paid"}
            >
              {r.pending > 0 ? (
                <I.clock style={{ width: 13, height: 13 }} />
              ) : r.balance === 0 ? (
                <I.check style={{ width: 13, height: 13 }} />
              ) : null}
              {monthLabel(r.month)}
              {r.balance > 0 && r.pending === 0 && ` · ${rupees(r.balance)} left`}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
