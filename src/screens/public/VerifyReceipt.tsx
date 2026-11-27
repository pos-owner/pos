import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { dateLabel, monthLabel, rupees } from "../../lib/format";
import type { VerifyResponse } from "../../lib/types";
import { copyText, Spinner, useToast } from "../../components/kit";
import { I } from "../../components/icons";
import "../../styles/verify.css";

/*
 * Public receipt verification. Routes: /verify/:code (from the QR printed on every receipt) and /verify (type or
 * paste a code). Works signed out, so an employer, a bank or the tenant's CA can check that pOS issued a receipt, for
 * how much, and whether the landlord voided it afterwards. It shows only what is already printed on the receipt.
 */

const METHOD: Record<string, string> = { upi: "UPI", cash: "Cash", bank: "Bank transfer" };
const CODE = /^[0-9a-z]{1,10}-[\w-]{12}$/;

/** Pulls a receipt code out of whatever was pasted: the code itself or the whole /verify/… link. */
export function extractCode(input: string): string {
  const s = input.trim();
  const fromLink = /\/verify\/([^/?#\s]+)/.exec(s);
  const code = decodeURIComponent(fromLink ? fromLink[1] : s).trim();
  return code;
}

function checkedLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function VerifyReceipt() {
  const { code = "" } = useParams();
  const { status } = useAuth();
  const signedIn = status === "ready";
  const { data, error, loading, reload } = useApi<VerifyResponse>(
    code ? `/api/verify/${encodeURIComponent(code)}` : null,
  );

  useEffect(() => {
    document.title = "Verify a rent receipt · pOS";
  }, []);

  let body;
  if (!code) body = <EnterCode />;
  else if (loading) body = <Checking />;
  else if (error && error.status !== 404) body = <Problem message={error.message} rateLimited={error.status === 429} retry={reload} />;
  else body = <Result code={code} data={error ? { valid: false } : (data ?? { valid: false })} />;

  return (
    <div className="verify-page">
      <a className="skip-link" href="#verify-main">
        Skip to result
      </a>
      <header className="verify-top">
        <Link to="/" className="verify-brand" aria-label="pOS home">
          <img src="/icons/icon.svg" alt="" width={34} height={34} />
          <span>
            <b>pOS</b>
            <small>Receipt verification</small>
          </span>
        </Link>
        <Link to="/" className="verify-open">
          {signedIn ? "Back to pOS" : "Open pOS"}
        </Link>
      </header>
      <main id="verify-main" className="verify-main" tabIndex={-1}>
        {body}
        <HowItWorks />
      </main>
      <footer className="verify-foot">
        <I.lock aria-hidden="true" />
        <span>
          Verification is free and needs no account. pOS shows only what is printed on the receipt, never phone
          numbers, bank details or the rest of the rent ledger.
        </span>
      </footer>
    </div>
  );
}

function Checking() {
  return (
    <section className="verify-card checking" aria-busy="true" aria-live="polite">
      <div className="verify-seal neutral">
        <Spinner size={30} />
      </div>
      <h1>Checking the receipt…</h1>
      <p>Matching the code with the landlord's rent ledger.</p>
    </section>
  );
}

function Problem({ message, rateLimited, retry }: { message: string; rateLimited: boolean; retry: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <section className="verify-card" role="alert">
      <div className="verify-seal neutral">{offline ? <I.wifiOff /> : <I.alert />}</div>
      <h1>{offline ? "You're offline" : rateLimited ? "Too many checks" : "Couldn't check right now"}</h1>
      <p>
        {offline
          ? "Connect to the internet, then try again. Verification always checks the live ledger."
          : rateLimited
            ? "This network has checked a lot of receipts in the last hour. Wait a while and try again."
            : message}
      </p>
      <div className="verify-actions">
        <button className="btn md auto" onClick={retry}>
          Try again
        </button>
      </div>
    </section>
  );
}

function Result({ code, data }: { code: string; data: VerifyResponse }) {
  const toast = useToast();
  const nav = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const valid = !!data.valid;
  const voided = valid && !!data.voided;
  const state = !valid ? "invalid" : voided ? "voided" : "genuine";

  // Screen readers hear the verdict first; keyboard users land on it.
  useEffect(() => {
    heading.current?.focus();
  }, [state]);

  const period =
    data.month && data.monthTo && data.monthTo !== data.month
      ? `${monthLabel(data.month, true)} to ${monthLabel(data.monthTo, true)}`
      : data.month
        ? monthLabel(data.month, true)
        : "";

  const share = async () => {
    const url = window.location.href;
    const text = valid
      ? `pOS verification for receipt ${data.number}: ${voided ? "voided by the landlord" : "genuine"}.`
      : "pOS receipt verification";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Receipt verification", text, url });
        return;
      } catch {
        /* cancelled: fall through to copying */
      }
    }
    toast((await copyText(url)) ? "Link copied" : "Couldn't copy the link", "copy");
  };

  return (
    <>
      <section className={`verify-card verdict ${state}`} aria-live="polite">
        <div className={`verify-seal ${state}`}>
          {state === "genuine" ? <I.shield /> : state === "voided" ? <I.alert /> : <I.x />}
        </div>
        <p className="verify-kicker">
          {state === "genuine" ? "Verified" : state === "voided" ? "Verified · no longer valid" : "Not verified"}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {state === "genuine"
            ? "Genuine receipt"
            : state === "voided"
              ? "This receipt was voided"
              : "Receipt not recognised"}
        </h1>
        <p>
          {state === "genuine"
            ? "pOS issued this receipt from the landlord's rent ledger, and the payment still counts toward the rent. The details below should match the paper exactly."
            : state === "voided"
              ? `pOS issued this receipt, but the landlord later voided the payment${data.voidedOn ? ` on ${dateLabel(data.voidedOn, true)}` : ""}. It no longer counts toward the rent, so don't accept it as proof of payment.`
              : "This code doesn't match any receipt issued through pOS. Check that you scanned the QR code printed on the receipt itself, or type the code again below."}
        </p>
        <p className="verify-checked">
          <I.clock aria-hidden="true" /> Checked {checkedLabel(data.checkedAt)} IST
        </p>
      </section>

      {valid && (
        <section aria-labelledby="slip-title">
          <h2 id="slip-title" className="verify-h2">
            Printed on the receipt
          </h2>
          <div className="slip-wrap">
            <article className={`slip ${voided ? "is-void" : ""}`}>
              <div className="slip-head">
                <img src="/icons/icon.svg" alt="" width={30} height={30} />
                <div>
                  <b>pOS</b>
                  <small>Rent receipt</small>
                </div>
                <div className="slip-no">
                  <b className="num">No. {data.number}</b>
                  {data.issuedOn && <small>Issued {dateLabel(data.issuedOn, true)}</small>}
                </div>
              </div>
              <div className="slip-perf" aria-hidden="true" />
              <div className="slip-amount">
                <small>Amount received</small>
                <strong className="num">{rupees(data.amount)}</strong>
                <span className={`slip-stamp ${voided ? "void" : "paid"}`}>{voided ? "Void" : "Paid"}</span>
              </div>
              <div className="slip-perf" aria-hidden="true" />
              <dl className="slip-rows">
                {data.tenant && (
                  <div>
                    <dt>Received from</dt>
                    <dd>
                      <b>{data.tenant}</b>
                    </dd>
                  </div>
                )}
                {period && (
                  <div>
                    <dt>Rent for</dt>
                    <dd>
                      {period}
                      {data.months && data.months > 1 ? ` (${data.months} months)` : ""}
                    </dd>
                  </div>
                )}
                {data.unit && (
                  <div>
                    <dt>Premises</dt>
                    <dd>{`${data.unit}${data.property ? `, ${data.property}` : ""}`}</dd>
                  </div>
                )}
                {data.paidOn && (
                  <div>
                    <dt>Paid on</dt>
                    <dd>
                      {dateLabel(data.paidOn, true)}
                      {data.method ? ` · ${METHOD[data.method] ?? data.method}` : ""}
                    </dd>
                  </div>
                )}
                {data.landlord && (
                  <div>
                    <dt>Landlord</dt>
                    <dd>{data.landlord}</dd>
                  </div>
                )}
              </dl>
              <div className="slip-perf" aria-hidden="true" />
              <p className="slip-foot">
                <I.checkCircle aria-hidden="true" /> Matched with the pOS rent ledger
              </p>
            </article>
          </div>

          <div className="verify-match">
            <h2 className="verify-h2">Before you accept it, check that</h2>
            <ul>
              <li>
                <I.check aria-hidden="true" /> the receipt number and the amount match the paper
              </li>
              <li>
                <I.check aria-hidden="true" /> the tenant's name and the premises are the ones you expect
              </li>
              <li>
                <I.check aria-hidden="true" /> the month (or months) covered is the period you were told
              </li>
            </ul>
          </div>
        </section>
      )}

      <div className="verify-actions">
        {valid && (
          <>
            <button className="btn md auto" onClick={share}>
              <I.share aria-hidden="true" /> Share this check
            </button>
            <button className="btn md auto tinted" onClick={() => window.print()}>
              <I.print aria-hidden="true" /> Print
            </button>
          </>
        )}
        <button className={`btn md auto ${valid ? "plain" : ""}`} onClick={() => nav("/verify")}>
          <I.qr aria-hidden="true" /> Verify another receipt
        </button>
      </div>
      {!valid && (
        <p className="verify-code-note">
          Code checked: <code>{code}</code>
        </p>
      )}
    </>
  );
}

function EnterCode() {
  const nav = useNavigate();
  const id = useId();
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = extractCode(value);
    if (!CODE.test(code)) {
      setErr("That doesn't look like a receipt code. It is printed under the QR code, like “1a-Xy3…”, or paste the whole link.");
      return;
    }
    setErr("");
    nav(`/verify/${encodeURIComponent(code)}`);
  };
  return (
    <section className="verify-card">
      <div className="verify-seal neutral">
        <I.qr />
      </div>
      <p className="verify-kicker">Free · no sign-in</p>
      <h1>Verify a rent receipt</h1>
      <p>
        Scan the QR code printed on the receipt with your phone's camera. Or paste the link or the code it opens
        here.
      </p>
      <form className="verify-form" onSubmit={submit} noValidate>
        <label htmlFor={id}>Receipt link or code</label>
        <div className="verify-input">
          <input
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…/verify/…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="url"
            aria-invalid={!!err}
            aria-describedby={err ? `${id}-err` : undefined}
          />
          <button className="btn md auto" type="submit" disabled={!value.trim()}>
            Verify
          </button>
        </div>
        {err && (
          <p id={`${id}-err`} className="verify-err" role="alert">
            {err}
          </p>
        )}
      </form>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="verify-how" aria-labelledby="how-title">
      <h2 id="how-title" className="verify-h2">
        How verification works
      </h2>
      <ol>
        <li>
          <span className="how-ic">
            <I.receipt aria-hidden="true" />
          </span>
          <div>
            <b>Every receipt carries a signed code</b>
            <p>pOS prints a QR code on each rent receipt. The code is signed, so it can't be guessed or edited.</p>
          </div>
        </li>
        <li>
          <span className="how-ic">
            <I.bank aria-hidden="true" />
          </span>
          <div>
            <b>It is matched with the live ledger</b>
            <p>The check reads the landlord's rent ledger at this moment, not a copy made when the receipt printed.</p>
          </div>
        </li>
        <li>
          <span className="how-ic">
            <I.shield aria-hidden="true" />
          </span>
          <div>
            <b>Voided payments show up at once</b>
            <p>If the landlord reverses a payment, its receipt shows as voided here, even on old printouts.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
