import { MediaPlay } from "@medusajs/icons";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { AttachmentChip } from "./attachment-chip";

/**
 * A customer's voice message or video. Platform links expire (we keep no
 * copy of these), so one that no longer loads turns into a chip saying so.
 */
export const MediaPlayer: FC<{ kind: "audio" | "video"; url?: string }> = ({
  kind,
  url,
}) => {
  const { t } = useTranslation();
  const [expired, setExpired] = useState(false);
  const label = kind === "audio" ? "voice" : "video";

  if (!url || expired)
    return (
      <AttachmentChip
        icon={<MediaPlay />}
        label={t(
          `conversations.attachment.${label}${expired ? "Expired" : ""}`,
        )}
      />
    );

  // preload="metadata" so a dead link shows as expired before anyone
  // presses play.
  return kind === "audio" ? (
    <audio
      controls
      preload="metadata"
      src={url}
      onError={() => setExpired(true)}
    />
  ) : (
    <video
      controls
      preload="metadata"
      src={url}
      onError={() => setExpired(true)}
      className="border-ui-border-base max-h-60 max-w-60 rounded-lg border"
    />
  );
};
