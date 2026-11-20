import { ROUTES } from "@/routes/constants";
import type { StageKey } from "./types";

/** The Customers list filtered to one stage, or to Lâu không nhắn. */
export const customersAtStage = (workspaceSlug: string, stage: StageKey) =>
  `/${workspaceSlug}/${ROUTES.Customers}?${
    stage === "DORMANT" ? "dormant=true" : `stage=${stage}`
  }`;
