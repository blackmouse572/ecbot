import { useMe } from "@/hooks/api";
import { useAuth } from "@/modules/auth";
import { Spinner, User } from "@medusajs/icons";
import { IconButton, Input, Tooltip } from "@medusajs/ui";
import { SectionRow } from "@repo/ui/common-components";

export const DebugTokenExtension = () => {
  const [token, setToken] = useAuth();

  return (
    <div className="flex items-center gap-2 [&>div]:flex-1">
      <Input
        value={token ?? ""}
        placeholder="Access token"
        onChange={(e) => setToken(e.target.value)}
      />
      {token && <UserDetails />}
    </div>
  );
};
function UserDetails() {
  const { isLoading, user } = useMe();
  if (isLoading) return <Spinner className="animate-spin" />;
  if (!user) return null;
  return (
    <Tooltip
      className="z-[2]"
      align="end"
      content={
        <div className="divide-y p-0">
          <SectionRow title="Name" value={user.name} />
          <SectionRow title="Email" value={user.email} />
          <SectionRow title="Phone" value={user.mobileNumber?.number} />
          <SectionRow title="Address" value={user.country.name} />
          <SectionRow title="Role" value={user.role.name} />
        </div>
      }
    >
      <IconButton size="small">
        <User />
      </IconButton>
    </Tooltip>
  );
}
