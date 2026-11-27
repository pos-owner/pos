import { useParams } from "react-router-dom";
import { useApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { dateLabel, monthLabel, rupees } from "../../lib/format";
import type { VerifyResponse } from "../../lib/types";
import { ErrorState, Page, Row, Section, SkeletonPage } from "../../components/kit";
import { I } from "../../components/icons";

/*
 * Public receipt verification (milestone 7). Route: /verify/:code, works signed out.
 * The QR code printed on every receipt opens this page, so an employer, a bank or the tenant's CA can check that the
 * receipt was issued by pOS, for how much, and whether the landlord voided it afterwards. It shows only what is
 * already printed on the receipt.
 */

export default function VerifyReceipt() {
  const { code = "" } = useParams();
  const { status } = useAuth();
  const { data, error, loading, reload } = useApi<VerifyResponse>(`/api/verify/${encodeURIComponent(code)}`);
  const back = status === "ready";

  if (loading)
    return (
      <Page title="Verify receipt" back={back} tabs={false}>
        <SkeletonPage variant="detail" />
      </Page>
    );
  if (error && error.status !== 404)
    return (
      <Page title="Verify receipt" back={back} tabs={false}>
        <ErrorState error={error} retry={reload} />
      </Page>
    );

  const valid = !!data?.valid && !error;
  const voided = valid && !!data?.voided;
  const tone = !valid ? "var(--red)" : voided ? "var(--orange)" : "var(--green)";
  const period =
    data?.month && data.monthTo && data.monthTo !== data.month
      ? `${monthLabel(data.month, true)} to ${monthLabel(data.monthTo, true)}`
      : data?.month
        ? monthLabel(data.month, true)
        : "";

  return (
    <Page title="Verify receipt" back={back} tabs={false}>
      <Section>
        <div className="card empty">
          <div className="em-ic" style={{ color: tone }}>
            {!valid ? <I.x /> : voided ? <I.alert /> : <I.checkCircle />}
          </div>
          <h3>
            {!valid ? "Receipt not recognised" : voided ? "This receipt was voided" : "Genuine receipt"}
          </h3>
          <p>
            {!valid
              ? "This code doesn't match any receipt issued through pOS. Check that you scanned the code printed on the receipt itself."
              : voided
                ? "pOS issued this receipt, but the landlord later voided the payment. It no longer counts toward the rent."
                : "pOS issued this receipt from the landlord's rent ledger. The details below should match the paper."}
          </p>
        </div>
      </Section>
      {valid && data && (
        <Section title="Printed on the receipt" footer="Only the details printed on the receipt are shown here.">
          <div className="list">
            <Row title="Receipt no." value={data.number} />
            <Row title="Amount" value={<span className="num">{rupees(data.amount)}</span>} />
            {period && <Row title="Rent for" value={period} />}
            {data.paidOn && <Row title="Paid on" value={dateLabel(data.paidOn, true)} />}
            {data.tenant && <Row title="Received from" value={data.tenant} />}
            {data.unit && <Row title="Premises" value={`${data.unit}${data.property ? `, ${data.property}` : ""}`} />}
            {data.landlord && <Row title="Landlord" value={data.landlord} />}
          </div>
        </Section>
      )}
    </Page>
  );
}
