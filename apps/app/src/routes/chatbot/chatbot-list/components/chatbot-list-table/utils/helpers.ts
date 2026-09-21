import type { TFunction } from "i18next";

export const getTimeAgo = (date: Date, t: TFunction): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t("general.timeAgo.seconds", { count: diffInSeconds });
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t("general.timeAgo.minutes", { count: diffInMinutes });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t("general.timeAgo.hours", { count: diffInHours });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t("general.timeAgo.days", { count: diffInDays });
  }

  return date.toLocaleDateString();
};
