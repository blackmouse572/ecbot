export function useDate() {
  const getFullDate = ({
    date,
    includeTime = false,
  }: {
    date: Date;
    includeTime?: boolean;
  }) => {
    if (!date) return "-";

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: includeTime ? "2-digit" : undefined,
      minute: includeTime ? "2-digit" : undefined,
      second: includeTime ? "2-digit" : undefined,
    };

    return new Intl.DateTimeFormat("default", options).format(date);
  };

  return { getFullDate };
}
