import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { features } from "../../lib/features";
import { dateLabel, longToday, relTime, todayISO } from "../../lib/format";
import type { MetersResponse, Priority, RequestListItem } from "../../lib/types";
import { ErrorState, NavButton, Page, PRIORITY_COLOR, Row, Section, Skeleton } from "../../components/kit";
import { I } from "../../components/icons";
import { Bell } from "../../components/Bell";
import { OutboxButton } from "../../components/OutboxButton";
import "../../styles/ops.css";
import "../../styles/owner.css";

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** How many rows each list shows before "See all". */
const SHOWN = 5;

/**
 * Staff home: what needs doing today. Open requests (yours first, then by priority) and the occupied units that
 * still need this month's meter photo, with one-tap shortcuts to the scanner and the expense form.
 */
export default function Today() {
  const { me } = useAuth();
  const nav = useNavigate();
  const name = me?.profile?.fullName ?? "";
  const reqs = useApi<RequestListItem[]>("/api/requests");
  const meters = useApi<MetersResponse>(features.meterReadings ? "/api/meters" : null);

  const open = useMemo(() => {
    const mine = (r: RequestListItem) => (!!name && r.assignedName === name ? 1 : 0);
    return (reqs.data ?? [])
      .filter((r) => r.status !== "done")
      .sort(
        (a, b) => mine(b) - mine(a) || RANK[a.priority] - RANK[b.priority] || b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [reqs.data, name]);

  const month = todayISO().slice(0, 7);
  const occupied = (meters.data?.units ?? []).filter((u) => u.occupied);
  const toRead = occupied.filter(
    (u) =>
      !meters.data?.readings.some(
        (r) => r.unitId === u.id && r.kind === "electricity" && r.readOn?.slice(0, 7) === month,
      ),
  );
  const waiting = meters.data?.pendingCount ?? 0;
  const showMeters = features.meterReadings && !!meters.data && occupied.length > 0;
  const caughtUp = !!reqs.data && !meters.loading && open.length === 0 && (!showMeters || toRead.length === 0);

  return (
    <Page
      title="Today"
      eyebrow={longToday()}
      left={<NavButton icon="gear" label="Settings" onClick={() => nav("/settings")} />}
      right={
        <>
          <OutboxButton />
          <Bell />
          <NavButton icon="plus" label="New request" accent onClick={() => nav("/requests?new=1")} />
        </>
      }
    >
      {reqs.loading ? (
        <Section>
          <Skeleton rows={4} avatar={false} />
        </Section>
      ) : reqs.error || !reqs.data ? (
        <ErrorState error={reqs.error ?? { message: "Couldn't load today's work." }} retry={reqs.reload} />
      ) : (
        <>
          <Section>
            <div className="stats" style={showMeters ? undefined : { gridTemplateColumns: "1fr" }}>
              <button type="button" className="stat stat-btn" onClick={() => nav("/requests")}>
                <div className="k">
                  <I.wrench style={{ color: "var(--orange)" }} /> Open requests
                </div>
                <div className="v">{open.length}</div>
                <div className="s">{open.filter((r) => r.priority === "high").length} urgent</div>
              </button>
              {showMeters && (
                <button type="button" className="stat stat-btn" onClick={() => nav("/meters")}>
                  <div className="k">
                    <I.gauge style={{ color: "var(--teal)" }} /> Meters to read
                  </div>
                  <div className="v">
                    {toRead.length} of {occupied.length}
                  </div>
                  <div className="s">{waiting ? `${waiting} waiting for owner` : "this month"}</div>
                </button>
              )}
            </div>
          </Section>

          <Section>
            <div className="stats" style={features.meterReadings ? undefined : { gridTemplateColumns: "1fr" }}>
              {features.meterReadings && (
                <button type="button" className="btn tinted md" onClick={() => nav("/meters")}>
                  <I.camera /> Scan a meter
                </button>
              )}
              <button type="button" className="btn tinted md" onClick={() => nav("/expenses?new=1")}>
                <I.wallet /> Log expense
              </button>
            </div>
          </Section>

          {caughtUp && (
            <Section>
              <div className="card tight caught-up">
                <span className="cu-ic">
                  <I.checkCircle />
                </span>
                <span className="grow">
                  <span className="t-headline" style={{ display: "block" }}>
                    Nothing left for today
                  </span>
                  <span className="t-sub c2">No open requests and every meter is read.</span>
                </span>
              </div>
            </Section>
          )}

          {open.length > 0 && (
            <Section
              title="Requests"
              action={
                open.length > SHOWN ? (
                  <button onClick={() => nav("/requests")}>See all {open.length}</button>
                ) : undefined
              }
            >
              <div className="list">
                {open.slice(0, SHOWN).map((r) => (
                  <button type="button" key={r.id} className="row req-row" onClick={() => nav(`/requests/${r.id}`)}>
                    <span
                      className="dot"
                      style={{ background: PRIORITY_COLOR[r.priority] }}
                      aria-label={`${r.priority} priority`}
                    />
                    <span className="grow">
                      <span className="title" style={{ display: "block" }}>
                        {r.title}
                      </span>
                      <span className="sub" style={{ display: "block" }}>
                        {r.unitLabel} · {r.propertyName}
                      </span>
                      <span className="req-meta">
                        <span>
                          <I.clock /> {relTime(r.updatedAt)}
                        </span>
                        {r.status === "in_progress" && <span>In progress</span>}
                        {r.assignedName ? (
                          <span>
                            <I.person /> {name && r.assignedName === name ? "You" : r.assignedName.split(" ")[0]}
                          </span>
                        ) : (
                          <span className="c-orange">Unassigned</span>
                        )}
                      </span>
                    </span>
                    <span className="end">
                      <span className="pill gray" style={{ color: PRIORITY_COLOR[r.priority] }}>
                        {cap(r.priority)}
                      </span>
                      <I.chevR className="chev" />
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {showMeters && toRead.length > 0 && (
            <Section
              title="Meters to read"
              action={
                toRead.length > SHOWN ? (
                  <button onClick={() => nav("/meters")}>See all {toRead.length}</button>
                ) : undefined
              }
              footer={
                waiting
                  ? `${waiting} ${waiting === 1 ? "reading is" : "readings are"} waiting for the owner to approve.`
                  : undefined
              }
            >
              <div className="list">
                {toRead.slice(0, SHOWN).map((u) => (
                  <Row
                    key={u.id}
                    icon="gauge"
                    iconBg="var(--teal)"
                    title={u.label}
                    sub={[
                      u.propertyName,
                      u.last.electricity ? `Last read ${dateLabel(u.last.electricity.readOn)}` : "No reading yet",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    end={
                      <span className="mini-btn">
                        <I.camera /> Scan
                      </span>
                    }
                    onClick={() => nav(`/meters?unit=${u.id}`)}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
