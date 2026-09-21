import { createMongoAbility } from "@casl/ability";
import { createContextualCan } from "@casl/react";
import { createContext, type ReactNode } from "react";
import type { AppAbility } from "./types";

// eslint-disable-next-line react-refresh/only-export-components
export const AbilityContext = createContext<AppAbility>(createMongoAbility());

export const Can = createContextualCan(AbilityContext.Consumer);

interface AbilityProviderProps {
  ability: AppAbility;
  children: ReactNode;
}

export const AbilityProvider = ({
  ability,
  children,
}: AbilityProviderProps) => (
  <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>
);
