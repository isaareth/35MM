import { useEffect, useState } from "react";

/** Whether the registration window is open, per the backend's
 * REGISTRATIONS_OPEN setting. Defaults to true until the check resolves,
 * so the CTA doesn't flash a "closed" state while the request is in flight. */
export function useRegistrationsOpen(): boolean {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    fetch(`${apiUrl}/api/registrations/status/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOpen(Boolean(data.open));
      })
      .catch(() => {});
  }, []);

  return open;
}
