export type TimezoneOption = { value: string; label: string; search: string };

// Shown first: where ecbot's customers are.
const PRIORITY_ZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Jakarta"];

// `Intl.supportedValuesOf` returns ICU's canonical ids, a few of which are
// the old IANA names. Both resolve everywhere; store and show the current one.
const LEGACY_ZONES: Record<string, string> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Louisville": "America/Kentucky/Louisville",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};

function utcOffset(zone: string, now: Date): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  // "GMT+07:00", or plain "GMT" for UTC itself.
  const offset = name?.replace("GMT", "") || "+00:00";
  return `UTC${offset}`;
}

/** Every IANA zone, labelled with its offset at `now`. Built on first open. */
export function buildTimezoneOptions(now = new Date()): TimezoneOption[] {
  const all = Intl.supportedValuesOf("timeZone").map(
    (zone) => LEGACY_ZONES[zone] ?? zone,
  );
  const zones = [...new Set([...PRIORITY_ZONES, ...all, "UTC"])];
  return zones.map((zone) => {
    const label = `(${utcOffset(zone, now)}) ${zone}`;
    return {
      value: zone,
      label,
      search: label.replace(/_/g, " ").toLowerCase(),
    };
  });
}

export function filterTimezoneOptions(
  options: TimezoneOption[],
  query: string,
): TimezoneOption[] {
  const needle = query.trim().replace(/_/g, " ").toLowerCase();
  if (!needle) return options;
  return options.filter((option) => option.search.includes(needle));
}
