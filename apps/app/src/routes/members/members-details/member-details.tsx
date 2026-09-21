import { useWorkspaceMember } from "@/hooks/api";
import { SingleColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage } from "@repo/ui/layout";
import { useParams } from "react-router-dom";
import { MemberRoleSection } from "./components/member-role-section/member-role-section";
import { MemberSummarySection } from "./components/member-summary-section/member-summary-section";

export function MemberDetails() {
  const { id } = useParams();
  const { member, isLoading, isError, error } = useWorkspaceMember(id!);

  if (isLoading || !member) {
    return <SingleColumnPageSkeleton showJSON showMetadata />;
  }

  if (isError) {
    throw error;
  }
  return (
    <SingleColumnPage>
      <MemberSummarySection item={member.user} />
      <MemberRoleSection item={member.role} />
    </SingleColumnPage>
  );
}
