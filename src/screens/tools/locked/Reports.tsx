import { LockedPreview } from "./LockedPreview";

/* Sample figures (in ₹ thousands) for the preview only. */
const DATA = [
  { m: "Jun", inc: 112, exp: 18 },
  { m: "Jul", inc: 112, exp: 9 },
  { m: "Aug", inc: 126, exp: 24 },
  { m: "Sep", inc: 126, exp: 12 },
  { m: "Oct", inc: 140, exp: 31 },
  { m: "Nov", inc: 115, exp: 6 },
];
const MAX = 140;

export default function Reports() {
  const income = DATA.reduce((s, d) => s + d.inc, 0);
  const spend = DATA.reduce((s, d) => s + d.exp, 0);
  return (
    <LockedPreview
      flag="reports"
      title="Reports & insights"
      icon="chart"
      tone="var(--pink)"
      action="Export report"
      summary="See how your properties are doing: income, expenses and profit by month and by property, occupancy over time, and which tenants often pay late."
      points={[
        "Monthly and yearly income, expenses and profit",
        "Occupancy and vacancy days for each unit",
        "Late-payment trends, so you can follow up early",
        "Export for your CA at tax time",
      ]}
    >
      <div className="stats">
        <div className="stat">
          <div className="k">Profit · 6 months</div>
          <div className="v">₹{((income - spend) / 100).toFixed(2)} L</div>
        </div>
        <div className="stat">
          <div className="k">Occupancy</div>
          <div className="v">86%</div>
        </div>
      </div>
      <div className="card mt12">
        <div className="t-headline">Income and expenses</div>
        <div className="legend" style={{ marginTop: 6 }}>
          <span>
            <i style={{ background: "var(--series-1)" }} /> Income
          </span>
          <span>
            <i style={{ background: "var(--series-2)" }} /> Expenses
          </span>
          <span>₹ thousands</span>
        </div>
        <div
          className="bars mt12"
          role="img"
          aria-label={`Sample: income ₹${income}k and expenses ₹${spend}k over 6 months`}
        >
          {DATA.map((d) => (
            <div className="b" key={d.m}>
              <div className="pair">
                <i
                  style={{ height: `${(d.inc / MAX) * 100}%`, background: "var(--series-1)" }}
                  title={`${d.m} income ₹${d.inc}k`}
                />
                <i
                  style={{ height: `${Math.max(3, (d.exp / MAX) * 100)}%`, background: "var(--series-2)" }}
                  title={`${d.m} expenses ₹${d.exp}k`}
                />
              </div>
              <span className="lbl">{d.m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="list mt12">
        <div className="row">
          <span className="grow">
            <span className="title" style={{ display: "block" }}>
              Often late
            </span>
            <span className="sub" style={{ display: "block" }}>
              Paid after the due date 3 of the last 6 months
            </span>
          </span>
          <span className="value">Rohit D.</span>
        </div>
      </div>
    </LockedPreview>
  );
}
