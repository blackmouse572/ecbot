import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import type { ActivityListResponseDto } from "@repo/client";
import { LinkButton, Section, SectionRow } from "@repo/ui/common-components";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@repo/ui/components";
import { type ParseKeys } from "i18next";
import type React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ActivityItem } from "./activity-item";
import { ACTIVITY_MESSAGE_MAP, ACTIVITY_SUBJECT_MESSAGE_MAP } from "./constant";

export interface Props {
  item: ActivityListResponseDto;
}
export function ActivityItemDefault({ item }: Props) {
  const { workspaceSlug } = useWorkspaceParams();
  const { t } = useTranslation();

  // Unlike other subjects, KNOWLEDGE_BASE metadata doesn't use a uniform
  // `{ id, name }` shape (it varies per endpoint: KB itself vs. an item
  // inside it) - resolve the display name across every shape in use.
  const getDisplayName = (): string | undefined => {
    const metadata = (item.metadata as A) || {};
    return (
      metadata.name ??
      metadata.itemTitle ??
      metadata.knowledgeBaseName ??
      undefined
    );
  };

  // Returns undefined when this subject/action has no detail page (or
  // enough metadata) to link to - callers must render plain text instead.
  const getLink = (): string | undefined => {
    const metadata = (item.metadata as A) || {};
    switch (item.subject) {
      case "CHATBOT":
        return `/${workspaceSlug}/chatbot/${metadata.id}`;
      case "ACCOUNT":
        return `/${workspaceSlug}/account/${metadata.id}`;
      case "WORKSPACE":
        return `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.Workspace}`;
      case "SKILL":
        return `/${workspaceSlug}/${ROUTES.Skills}/${metadata.id}`;
      case "ROLE":
        return `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceRoles}/${metadata.id}`;
      case "KNOWLEDGE_BASE":
        // Only item-level activities carry both ids (KB-level activities and
        // the chatbot<->item link/unlink events don't - no detail page for
        // those yet, so they fall through to plain text below).
        return metadata.knowledgeBaseId && metadata.itemId
          ? `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${metadata.knowledgeBaseId}/item/${metadata.itemId}`
          : undefined;
      default:
        return undefined;
    }
  };

  const getInterpolation = () => {
    const name = getDisplayName();
    const link = getLink();
    switch (item.action) {
      case "create":
      case "update":
        return {
          name: link ? (
            <LinkButton asChild>
              <Link to={link}>{name}</Link>
            </LinkButton>
          ) : (
            name
          ),
        };
      default:
        return { name };
    }
  };

  const getComponents = (): Record<string, React.ReactElement> => {
    const metadata = (item.metadata as A) || {};
    const name = getDisplayName();
    const link = getLink();
    // `<link/>` only makes sense when this subject has a detail page - fall
    // back to plain text so an i18n string referencing it never 404s.
    const linkComponent = link ? (
      <LinkButton asChild>
        <Link to={link}>{name}</Link>
      </LinkButton>
    ) : (
      <>{name}</>
    );

    switch (item.action) {
      case "link_account_chatbot":
      case "unlink_account_chatbot":
        return {
          account: (
            <LinkButton asChild>
              <Link to={`/${workspaceSlug}/account/${metadata.accountId}`}>
                {metadata.accountName}
              </Link>
            </LinkButton>
          ),
          link: linkComponent,
        };
      default:
        return { link: linkComponent };
    }
  };

  const getMessage = (): ParseKeys => {
    const bySubject =
      ACTIVITY_SUBJECT_MESSAGE_MAP[`${item.subject}:${item.action}`];
    const byAction = ACTIVITY_MESSAGE_MAP[item.action];
    return bySubject ?? byAction ?? "activities.unknown";
  };

  return (
    <ActivityItem>
      <ActivityItem.ByAvatar
        src={(item.by as A)?.photo?.url}
        fallback={getAvatarFallback(item.by?.name)}
      />
      <ActivityItem.Body>
        <ActivityItem.Title>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Link
                to={`/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceMember}/${item.by.id}`}
              >
                <ActivityItem.Name user={item.by} />
              </Link>
            </HoverCardTrigger>
            <HoverCardContent>
              <Section variant="spaced">
                <SectionRow title={t("fields.name")} value={item.by.name} />
                <SectionRow title={t("fields.email")} value={item.by.email} />
              </Section>
            </HoverCardContent>
          </HoverCard>
          &nbsp;
          <Trans
            i18nKey={getMessage() as A}
            {...getInterpolation()}
            components={getComponents()}
          />
        </ActivityItem.Title>
        <ActivityItem.Date>{new Date(item.createdAt) as A}</ActivityItem.Date>
      </ActivityItem.Body>
    </ActivityItem>
  );
}
