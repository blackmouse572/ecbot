import type { ReactNode } from "react";

/** One selectable row in the command palette. */
export type CommandPaletteItem = {
  id: string;
  label: string;
  icon: ReactNode;
  /** Muted text after the label, e.g. a customer's phone or a page's section. */
  hint?: string;
  /** Where the row navigates. Absent for rows resolved on select, like customers. */
  to?: string;
  customerId?: string;
};

export type CommandPaletteGroup = {
  key: string;
  heading: string;
  items: CommandPaletteItem[];
};
