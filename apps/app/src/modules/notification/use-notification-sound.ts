import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

import { playNotificationChime } from "./play-notification-chime";
import { notificationSoundAtom } from "./state";

/** Chimes when the unread count rises after the first load. */
export const useNotificationSound = (count: number, isFetched: boolean) => {
  const soundOn = useAtomValue(notificationSoundAtom);
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isFetched) return;
    if (soundOn && previous.current !== undefined && count > previous.current) {
      playNotificationChime();
    }
    previous.current = count;
  }, [count, isFetched, soundOn]);
};
