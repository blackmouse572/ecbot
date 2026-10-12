import { atomWithStorage } from "jotai/utils";

// Per browser, like the theme: on by default, switched in Preferences.
export const soundEnabledAtom = atomWithStorage<boolean>(
  "eccho:sound",
  true,
  undefined,
  { getOnInit: true },
);
