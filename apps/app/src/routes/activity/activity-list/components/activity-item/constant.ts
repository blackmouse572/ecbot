import { type ActivityListResponseDto } from "@repo/client";
import type { ParseKeys } from "i18next";

type ActivitySubject = ActivityListResponseDto["subject"];
type ActivityAction = ActivityListResponseDto["action"];

// Generic actions (create/update/delete) mean different things per subject -
// override by "SUBJECT:action" first, fall back to ACTIVITY_MESSAGE_MAP by action.
export const ACTIVITY_SUBJECT_MESSAGE_MAP: Partial<
  Record<`${ActivitySubject}:${ActivityAction}`, ParseKeys>
> = {
  "CHATBOT:create": "activities.chatbot.create",
  "CHATBOT:update": "activities.chatbot.update",
  "CHATBOT:delete": "activities.chatbot.delete",
  "CHATBOT:clone_chatbot": "activities.chatbot.clone",
  "SKILL:create": "activities.skill.create",
  "SKILL:update": "activities.skill.update",
  "SKILL:delete": "activities.skill.delete",
  "SKILL:chatbot_skill_enable": "activities.skill.enable",
  "SKILL:chatbot_skill_disable": "activities.skill.disable",
  "RAG:create": "activities.knowledgeBase.create",
  "RAG:delete": "activities.knowledgeBase.delete",
  "KNOWLEDGE_BASE:create": "activities.knowledgeBase.create",
  "KNOWLEDGE_BASE:update": "activities.knowledgeBase.update",
  "KNOWLEDGE_BASE:delete": "activities.knowledgeBase.delete",
  "TOOL:tool_start_install": "activities.tool.startInstall",
  "TOOL:tool_complete_install": "activities.tool.completeInstall",
  "TOOL:chatbot_tool_enable": "activities.tool.enable",
  "TOOL:chatbot_tool_disable": "activities.tool.disable",
  "ROLE:role_active": "activities.role.active",
  "ROLE:role_inactive": "activities.role.inactive",
  "API_KEY:api_key_reset": "activities.apiKey.reset",
  "CUSTOMER:customer_unmerge": "activities.customer.unmerge",
  "CUSTOMER:customer_merge_confirm": "activities.customer.mergeConfirm",
  "CUSTOMER:customer_merge_dismiss": "activities.customer.mergeDismiss",
};

// Subject-agnostic fallback, used when no SUBJECT:action override exists above.
export const ACTIVITY_MESSAGE_MAP: Partial<Record<ActivityAction, ParseKeys>> = {
  create: "activities.generic.create",
  update: "activities.generic.update",
  delete: "activities.generic.delete",
  invite_member: "activities.member.invite",
  remove_member: "activities.member.remove",
  approve_join_workspace: "activities.member.approve",
  active_chatbot: "activities.chatbot.active",
  archive_chatbot: "activities.chatbot.archive",
  inactive_chatbot: "activities.chatbot.inactive",
  unarchive_chatbot: "activities.chatbot.unarchive",
  link_account_chatbot: "activities.chatbot.linkAccount",
  unlink_account_chatbot: "activities.chatbot.unlinkAccount",
};
