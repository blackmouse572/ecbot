import { useMe } from "@/hooks/api";
import { SingleColumnPageSkeleton } from "@repo/ui/common-components";
import { ProfileDeleteSection, ProfileGeneralSection } from "./components";

export const ProfileDetail = () => {
  const { user, isPending: isLoading, isError, error } = useMe();

  if (isLoading || !user) {
    return <SingleColumnPageSkeleton sections={1} />;
  }

  if (isError) {
    throw error;
  }
  return (
    <div className="flex flex-col gap-y-3">
      <ProfileGeneralSection user={user} />
      <ProfileDeleteSection user={user} />
    </div>
  );
};
