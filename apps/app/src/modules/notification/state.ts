import { atomWithStorage } from "jotai/utils";

// Per browser, like the theme: on by default, switched in Preferences.
export const notificationSoundAtom = atomWithStorage<boolean>(
  "eccho:notification-sound",
  true,
  undefined,
  { getOnInit: true },
);
