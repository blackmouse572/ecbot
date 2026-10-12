import { useSoundOnChange } from "./use-sound-on-change";

/** Plays when the unread count rises; `undefined` means "not loaded yet". */
export const useNotificationSound = (count: number | undefined) =>
  useSoundOnChange(count, (previous, next) =>
    next > previous ? "notification" : null,
  );
