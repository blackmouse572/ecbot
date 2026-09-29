import { loginRedirectTarget, useAuthToken } from "@/modules/auth";
import { ROUTES } from "@/routes/constants";
import {
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AuthHero } from "./auth-hero";

function AuthLayout() {
  const token = useAuthToken();
  const { pathname } = useLocation();
  const [search] = useSearchParams();

  // Login sets the token and navigates to the redirect itself, but this
  // guard re-renders after that navigation and would win, so it must send
  // the user to the same place.
  if (token) {
    return (
      <Navigate to={loginRedirectTarget(search.get("redirect"))} replace />
    );
  }

  const heroVariant = pathname.includes(ROUTES.SignUp) ? "signup" : "login";

  return (
    <div className="bg-ui-bg-subtle flex h-screen w-screen items-center gap-x-4 p-4">
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-y-4 overflow-y-auto">
        <div className="bg-ui-button-neutral shadow-buttons-neutral after:button-neutral-gradient relative flex size-8 shrink-0 items-center justify-center rounded-lg after:inset-0 after:content-['']">
          <img
            src="/favicon/favicon.svg"
            alt="Ecbot"
            width={32}
            height={32}
            className="size-5"
          />
        </div>
        <Outlet />
      </div>
      <AuthHero variant={heroVariant} className="hidden lg:block" />
    </div>
  );
}

export { AuthLayout };
