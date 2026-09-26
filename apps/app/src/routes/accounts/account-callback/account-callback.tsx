import { LogoBoxSpinner, Skeleton } from "@repo/ui/common-components";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function AccountCallback() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");
    const state = params.get("state");

    if (code) {
      window.opener.postMessage(
        { type: "oauth-success", payload: { code, state } },
        window.location.origin,
      );
    } else if (error) {
      window.opener.postMessage(
        { type: "oauth-error", payload: { error } },
        window.location.origin,
      );
    }
    const t = setTimeout(() => {
      window.close();
    }, 1000);

    return () => clearTimeout(t);
  }, [location.search]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 container mx-auto">
      <div className="py-8">
        <LogoBoxSpinner />
      </div>
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-16" />
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="w-full h-16" />
        <Skeleton className="w-full h-16" />
      </div>
      <Skeleton className="w-full h-16" />
      <Skeleton className="w-full h-16" />
    </div>
  );
}
