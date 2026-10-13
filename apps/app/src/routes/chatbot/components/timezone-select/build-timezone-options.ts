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

/** The current IANA name for an old ICU id; other ids are returned as is. */
export function canonicalZone(zone: string): string {
  return LEGACY_ZONES[zone] ?? zone;
}

function formatterFor(zone: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    });
  } catch {
    // A browser with older time zone data may not know the current name.
    return null;
  }
}

function utcOffset(formatter: Intl.DateTimeFormat, now: Date): string {
  const name = formatter
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  // "GMT+07:00", or plain "GMT" for UTC itself.
  const offset = name?.replace("GMT", "") || "+00:00";
  return `UTC${offset}`;
}

/** Every IANA zone the browser knows, labelled with its offset at `now`. */
export function buildTimezoneOptions(now = new Date()): TimezoneOption[] {
  const options = new Map<string, TimezoneOption>();
  const zones = [
    ...PRIORITY_ZONES,
    ...Intl.supportedValuesOf("timeZone"),
    "UTC",
  ];
  for (const id of zones) {
    const modern = canonicalZone(id);
    let zone = modern;
    let formatter = formatterFor(modern);
    if (!formatter && modern !== id) {
      zone = id;
      formatter = formatterFor(id);
    }
    if (!formatter || options.has(zone)) continue;
    const label = `(${utcOffset(formatter, now)}) ${zone}`;
    options.set(zone, {
      value: zone,
      label,
      search: label.replace(/_/g, " ").toLowerCase(),
    });
  }
  return [...options.values()];
}

let cached: TimezoneOption[] | null = null;

/** The list for this session: built on the first open, shared by every picker. */
export function getTimezoneOptions(): TimezoneOption[] {
  cached ??= buildTimezoneOptions();
  return cached;
}

export function filterTimezoneOptions(
  options: TimezoneOption[],
  query: string,
): TimezoneOption[] {
  const needle = query.trim().replace(/_/g, " ").toLowerCase();
  if (!needle) return options;
  return options.filter((option) => option.search.includes(needle));
}
