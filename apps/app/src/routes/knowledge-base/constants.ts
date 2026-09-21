import i18n from "i18next";
import {
  IconFileText,
  IconLink,
  IconTextPlus,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";

export type KBTypeColor = "blue" | "green" | "purple" | "orange";
export type KBStatusColor = "blue" | "green" | "grey" | "red" | "orange";

export interface KBTypeConfigItem {
  label: string;
  color: KBTypeColor;
  icon: string;
}

export interface KBStatusConfigItem {
  label: string;
  color: KBStatusColor;
  icon: string;
}

export const KB_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: KBTypeColor;
    icon: string;
  }
> = {
  FILE: {
    label: i18n.t("knowledgeBase.type.FILE"),
    color: "blue",
    icon: "IconFileText",
  },
  URL: {
    label: i18n.t("knowledgeBase.type.URL"),
    color: "green",
    icon: "IconLink",
  },
  TEXT: {
    label: i18n.t("knowledgeBase.type.TEXT"),
    color: "purple",
    icon: "IconTextPlus",
  },
};

export const KB_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: KBStatusColor;
    icon: string;
  }
> = {
  DRAFT: {
    label: i18n.t("knowledgeBase.status.DRAFT"),
    color: "grey",
    icon: "IconClock",
  },
  READY: {
    label: i18n.t("knowledgeBase.status.READY"),
    color: "green",
    icon: "IconCheck",
  },
  PROCESSING: {
    label: i18n.t("knowledgeBase.status.PROCESSING"),
    color: "blue",
    icon: "IconLoader2",
  },
  COMPLETED: {
    label: i18n.t("knowledgeBase.status.COMPLETED"),
    color: "green",
    icon: "IconCheck",
  },
  FAILED: {
    label: i18n.t("knowledgeBase.status.FAILED"),
    color: "red",
    icon: "IconX",
  },
};

export const KB_TYPE_ICON_COMPONENTS = {
  IconFileText,
  IconLink,
  IconTextPlus,
};

export const KB_STATUS_ICON_COMPONENTS = {
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconLoader2,
  IconX,
};

export const KB_QUERY_PARAMS = [
  "page",
  "perPage",
  "type",
  "status",
  "tags",
  "search",
  "order",
];
