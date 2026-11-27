import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError, invalidate, useApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { dateLabel, relTime } from "../../lib/format";
import type { Priority, RequestDetailResponse, RequestStatus } from "../../lib/types";
import {
  ErrorState,
  Lightbox,
  Page,
  PRIORITY_COLOR,
  Row,
  Section,
  Segmented,
  SelectField,
  SkeletonPage,
  Spinner,
  StatusPill,
  useToast,
} from "../../components/kit";
import { I } from "../../components/icons";
import { Thumb, usePhotos } from "../../components/PhotoPicker";
import "../../styles/ops.css";

const SYSTEM = /^(Reopened|Marked in progress|Marked done)\.$/;

export default function RequestDetail() {
  const { id = "" } = useParams();
  const { me } = useAuth();
  const canManage = me?.profile?.role === "owner" || me?.profile?.role === "staff";
  const key = `/api/requests/${id}`;
  const { data, error, loading, reload } = useApi<RequestDetailResponse>(key);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const end = useRef<HTMLDivElement>(null);
  const seen = useRef<number | null>(null);

  // Scroll to the newest update when one is added, but not on first open.
  useEffect(() => {
    const n = data?.comments.length;
    if (n === undefined) return;
    if (seen.current !== null && n > seen.current) end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    seen.current = n;
  }, [data?.comments.length]);

  if (loading)
    return (
      <Page title="Request" back tabs={false}>
        <SkeletonPage />
      </Page>
    );
  if (error || !data)
    return (
      <Page title="Request" back tabs={false}>
        <ErrorState error={error ?? { message: "Couldn't load this request." }} retry={reload} />
      </Page>
    );

  const r = data.request;

  async function update(patch: Record<string, unknown>, tag: string, done: string) {
    setBusy(tag);
    try {
      await api(key, { method: "PATCH", body: patch });
      invalidate("/api/requests", "/api/dashboard", "/api/tenants");
      toast(done);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update the request", "alert");
    } finally {
      setBusy("");
    }
  }

  return (
    <Page title={r.title} back tabs={false} eyebrow={`${r.unitLabel} · ${r.propertyName}`}>
      <Section>
        <div className="card">
          <div className="between">
            <span className="hstack" style={{ gap: 8 }}>
              <span className="dot" style={{ background: PRIORITY_COLOR[r.priority] }} />
              <span className="t-sub w6" style={{ color: PRIORITY_COLOR[r.priority] }}>
                {r.priority === "high" ? "Urgent" : r.priority === "medium" ? "Medium priority" : "Low priority"}
              </span>
            </span>
            <StatusPill status={r.status} />
          </div>
          {r.description && (
            <p className="t-body" style={{ margin: "12px 0 0", whiteSpace: "pre-wrap" }}>
              {r.description}
            </p>
          )}
          <div className="t-foot c2 mt12">
            Raised by {r.raisedByName || "someone"} · {dateLabel(r.createdAt, true)}
          </div>
          {r.photos.length > 0 && (
            <div className="photos mt12">
              {r.photos.map((src, i) => (
                <button
                  key={src}
                  className="photo-btn"
                  onClick={() => setPhoto(src)}
                  aria-label={`Open photo ${i + 1}`}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {canManage && (
        <Section title="Status">
          <Segmented<RequestStatus>
            label="Status"
            value={r.status}
            onChange={(v) =>
              v !== r.status &&
              update(
                { status: v },
                "status",
                v === "done" ? "Marked done" : v === "in_progress" ? "Marked in progress" : "Reopened",
              )
            }
            options={[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ]}
          />
          <div className="list mt12">
            <SelectField<string>
              label="Assigned to"
              value={r.assignedTo ?? ""}
              onChange={(v) =>
                update(
                  { assignedTo: v || null },
                  "assign",
                  v
                    ? `Assigned to ${data.assignees.find((a) => a.id === v)?.name.split(" ")[0] ?? "staff"}`
                    : "Unassigned",
                )
              }
              options={[
                { value: "", label: "Unassigned" },
                ...data.assignees.map((a) => ({
                  value: a.id,
                  label: `${a.name}${a.role === "owner" ? " (owner)" : ""}`,
                })),
              ]}
            />
            <SelectField<Priority>
              label="Priority"
              value={r.priority}
              onChange={(v) => update({ priority: v }, "priority", "Priority updated")}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "Urgent" },
              ]}
            />
          </div>
          {busy && (
            <div className="t-foot c2 center-text mt8">
              <Spinner size={14} /> Saving…
            </div>
          )}
          {!data.assignees.some((a) => a.role === "staff") && me?.profile?.role === "owner" && (
            <div className="section-foot">Invite a caretaker from More → Invites to assign requests to them.</div>
          )}
        </Section>
      )}

      {!canManage && r.status === "done" && (
        <Section>
          <div className="list icons">
            <Row icon="checkCircle" iconBg="var(--green)" title="Fixed" sub={`Marked done ${relTime(r.updatedAt)}`} />
          </div>
        </Section>
      )}

      <div className="section-head" style={{ margin: "0 var(--gap)" }}>
        <h2>Updates</h2>
      </div>
      <div className="thread" aria-live="polite">
        {!data.comments.length && (
          <div className="bubble system">
            {data.canComment ? "No updates yet. Add a comment or photo below." : "No updates yet."}
          </div>
        )}
        {data.comments.map((c) =>
          SYSTEM.test(c.body) && !c.photo ? (
            <div key={c.id} className="bubble system">
              {c.mine ? "You" : c.authorName} {c.body.replace(/\.$/, "").toLowerCase().replace("marked", "marked this")}{" "}
              · {relTime(c.createdAt)}
            </div>
          ) : (
            <div key={c.id} className={`bubble ${c.mine ? "mine" : ""}`}>
              {!c.mine && <div className="who">{c.authorName}</div>}
              {c.body && <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>}
              {c.photo && (
                <button className="bubble-photo" onClick={() => setPhoto(c.photo)} aria-label="Open photo">
                  <img src={c.photo} alt="" loading="lazy" />
                </button>
              )}
              <div className="bubble-time">{relTime(c.createdAt)}</div>
            </div>
          ),
        )}
        <div ref={end} style={{ height: 96 }} />
      </div>

      {data.canComment ? (
        <Composer requestKey={key} />
      ) : (
        <div className="composer-note t-foot c2" role="note">
          Only the person who raised this request can add comments. You'll see updates here.
        </div>
      )}
      <Lightbox src={photo} onClose={() => setPhoto(null)} />
    </Page>
  );
}

function Composer({ requestKey }: { requestKey: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const photos = usePhotos(1);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const p = photos.photos[0];
  const canSend = (!!text.trim() || (!!p && p.state === "done")) && !photos.uploading && !busy;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    try {
      await api(`${requestKey}/comments`, { body: { body: text.trim(), photoKey: photos.keys[0] } });
      setText("");
      photos.reset();
      invalidate(requestKey, "/api/requests");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't send", "alert");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {p && (
        <div className="composer-attach">
          <Thumb p={p} onRemove={() => photos.remove(p.id)} size={76} />
        </div>
      )}
      <div className="composer glass">
        <button
          className="circle-btn glass"
          aria-label="Add photo"
          onClick={() => input.current?.click()}
          disabled={!!p}
        >
          <I.camera />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            photos.add(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="box">
          <textarea
            rows={1}
            value={text}
            placeholder="Add a comment"
            aria-label="Comment"
            maxLength={2000}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="circle-btn accent hit44"
            aria-label="Send"
            onClick={send}
            disabled={!canSend}
            style={{ width: 32, height: 32, margin: "6px 0" }}
          >
            {busy ? <Spinner size={16} /> : <I.send style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </div>
    </>
  );
}
