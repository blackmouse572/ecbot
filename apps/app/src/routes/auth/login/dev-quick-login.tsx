import { LoginForm } from "@repo/auth/components";
import { Badge } from "@medusajs/ui";

const DEV_ACCOUNTS = [
  { label: "superadmin", email: "superadmin@mail.com" },
  { label: "admin", email: "admin@mail.com" },
  { label: "individual", email: "individual@mail.com" },
  { label: "premium", email: "premium@mail.com" },
  { label: "business", email: "business@mail.com" },
] as const;

const DEV_PASSWORD = "aaAA@123";

function DevQuickLogin({
  onLogin,
}: {
  onLogin: React.ComponentProps<typeof LoginForm>["onSubmit"];
}) {
  return (
    <div className="flex flex-col gap-y-2 pt-2 border-t border-ui-border-base">
      <span className="text-ui-fg-muted text-xs text-center">DEV ACCOUNTS</span>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {DEV_ACCOUNTS.map(({ label, email }) => (
          <Badge
            key={email}
            onClick={() => onLogin({ email, password: DEV_PASSWORD })}
            aria-label={`Login as ${label}`}
            className="cursor-pointer"
            size="small"
          >
            {label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default DevQuickLogin;
