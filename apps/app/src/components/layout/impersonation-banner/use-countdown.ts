import { useEffect, useState } from "react";

const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// End the session this long before the token expires: once it has expired the
// API rejects /impersonate/end (401), so no audit row would be written.
export const END_LEAD_MS = 3000;

export function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const ms = expiresAt - now;
  return { ms, label: fmt(ms), expired: ms <= 0, ending: ms <= END_LEAD_MS };
}
