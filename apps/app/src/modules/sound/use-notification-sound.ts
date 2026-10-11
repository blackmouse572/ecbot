import { useSoundOnChange } from "./use-sound-on-change";

/** Plays when the unread count rises after the first load. */
export const useNotificationSound = (count: number, isFetched: boolean) =>
  useSoundOnChange(isFetched ? count : undefined, (previous, next) =>
    next > previous ? "notification" : null,
  );
