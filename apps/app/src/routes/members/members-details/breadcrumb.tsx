import { useWorkspaceMember } from "@/hooks/api";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";

type MemberDetailBreadcrumbProps = UIMatch<AccountGetDetailResponseDto>;

export const MemberDetailBreadcrumb = (props: MemberDetailBreadcrumbProps) => {
  const { id } = props.params || {};

  const { member } = useWorkspaceMember(id!);

  if (!member) {
    return null;
  }

  return (
    <span>
      {member.user.name}
      <Helmet>
        <title>{member.user.name} - Ecbot</title>
      </Helmet>
    </span>
  );
};
