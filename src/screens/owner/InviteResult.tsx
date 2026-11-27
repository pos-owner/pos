import { firstName } from "../../lib/format";
import { whatsappLink } from "../../lib/links";
import type { CreatedInvite } from "../../lib/types";
import { copyText, Section, useToast } from "../../components/kit";
import { I } from "../../components/icons";
import "../../styles/ops.css";

export const inviteUrl = (token: string) => `${location.origin}/join/${token}`;

/** Shown once after creating an invite: the link to send and the PIN to say separately. */
export function InviteResult({
  invite,
  ownerName,
  phone,
  onDone,
}: {
  invite: CreatedInvite;
  ownerName: string;
  phone?: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const link = inviteUrl(invite.token);
  const who = firstName(invite.name) || "there";
  const what =
    invite.role === "tenant"
      ? "see your rent, pay by UPI and raise maintenance requests"
      : "handle maintenance requests and log expenses";
  const text = `Hi ${who}, ${ownerName || "I"} added you to pOS so you can ${what}. Open this link to join: ${link}\nI'll tell you your PIN separately.`;
  const expires = new Date(invite.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" });

  async function copy(v: string, label: string) {
    if (await copyText(v)) toast(`${label} copied`, "copy");
  }
  async function share() {
    try {
      await navigator.share({ title: "Join pOS", text });
    } catch {
      /* dismissed */
    }
  }

  return (
    <>
      <div className="center-text" style={{ padding: "4px 20px 20px" }}>
        <div className="done-ic">
          <I.check />
        </div>
        <div className="t-title2 mt12">Invite ready for {who}</div>
        <div className="t-sub c2" style={{ marginTop: 4 }}>
          Send the link, then tell them the PIN by phone or in person. It works once and expires on {expires}.
        </div>
      </div>
      <Section title="PIN" footer="This PIN is only shown now. If it's lost, revoke the invite and make a new one.">
        <button
          className="card center-text"
          style={{ width: "100%" }}
          onClick={() => copy(invite.pin, "PIN")}
          aria-label={`PIN ${invite.pin.split("").join(" ")}. Tap to copy`}
        >
          <div className="pin">
            {invite.pin.slice(0, 3)} {invite.pin.slice(3)}
          </div>
          <div className="t-foot c-accent mt8">
            <I.copy style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> Tap to copy
          </div>
        </button>
      </Section>
      <Section title="Invite link">
        <div className="link-box">{link}</div>
        <div className="stack-8 mt12">
          <a className="btn whatsapp" href={whatsappLink(phone ?? "", text)} target="_blank" rel="noopener noreferrer">
            <I.chat /> Send on WhatsApp
          </a>
          <div className="btn-row">
            <button className="btn gray md" onClick={() => copy(link, "Link")}>
              <I.copy /> Copy link
            </button>
            {"share" in navigator && (
              <button className="btn gray md" onClick={share}>
                <I.share /> Share
              </button>
            )}
          </div>
          <button className="btn tinted md" onClick={onDone}>
            Done
          </button>
        </div>
      </Section>
    </>
  );
}
