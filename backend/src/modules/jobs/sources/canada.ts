// Province and territory names, plus a few big cities whose name is not shared
// with a well known place outside Canada.
const CANADA_WORDS = [
  "Canada",
  "Ontario",
  "Quebec",
  "Québec",
  "British Columbia",
  "Alberta",
  "Saskatchewan",
  "Manitoba",
  "Nova Scotia",
  "New Brunswick(?!,?\\s*(?:NJ|New Jersey))",
  "Prince Edward Island",
  "Newfoundland",
  "Labrador",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
  "Toronto",
  "Vancouver",
  "Montreal",
  "Montréal",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Mississauga",
];

const CANADA_NAMES = new RegExp(`(?:^|[^\\p{L}])(?:${CANADA_WORDS.join("|")})(?![\\p{L}])`, "iu");

// Abbreviations only count in capitals after a comma, as in "Toronto, ON",
// so words like "on" or "ab" in other places do not match.
const PROVINCE_CODES = /,\s*(?:ON|QC|BC|AB|SK|MB|NS|NB|PE|PEI|NL|YT|NT|NU)\b/;

/**
 * True when a job location is in Canada. "Remote" alone does not count; it has
 * to say Canada (or a province) too, as in "Remote, Canada".
 */
export function isInCanada(location: string): boolean {
  return CANADA_NAMES.test(location) || PROVINCE_CODES.test(location);
}

/**
 * The same check as a MongoDB filter on `location`, so stored jobs outside
 * Canada are never listed. MongoDB regexes are UTF-8, so \p{L} still works.
 */
export const CANADA_LOCATION_FILTER = {
  $or: [{ location: CANADA_NAMES }, { location: PROVINCE_CODES }],
};

/** Canadian provinces and territories by their two letter code. */
export const PROVINCES = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
} as const;

export type ProvinceCode = keyof typeof PROVINCES;
export const PROVINCE_CODE_LIST = Object.keys(PROVINCES) as ProvinceCode[];

// Bigger cities and towns, so "Brampton" alone still gives Ontario.
const CITY_PROVINCES: Record<ProvinceCode, string[]> = {
  ON: [
    "Toronto", "Brampton", "Mississauga", "Ottawa", "Hamilton", "London", "Markham", "Vaughan",
    "Kitchener", "Waterloo", "Cambridge", "Windsor", "Richmond Hill", "Oakville", "Burlington",
    "Oshawa", "Whitby", "Ajax", "Pickering", "Barrie", "Guelph", "Sudbury", "Kingston",
    "Thunder Bay", "St. Catharines", "Niagara Falls", "Milton", "Scarborough", "Etobicoke",
    "North York", "Peterborough", "Belleville", "Sault Ste. Marie", "Caledon", "Newmarket",
  ],
  QC: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Trois-Rivieres", "Saguenay", "Levis"],
  BC: [
    "Vancouver", "Surrey", "Burnaby", "Richmond", "Victoria", "Kelowna", "Abbotsford", "Coquitlam",
    "Langley", "Nanaimo", "Kamloops", "Delta", "Prince George",
  ],
  AB: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Airdrie", "Fort McMurray"],
  SK: ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw"],
  MB: ["Winnipeg", "Brandon", "Steinbach"],
  NS: ["Halifax", "Dartmouth", "Sydney", "Truro"],
  NB: ["Moncton", "Saint John", "Fredericton"],
  NL: ["St. John's", "Mount Pearl", "Corner Brook"],
  PE: ["Charlottetown", "Summerside"],
  YT: ["Whitehorse"],
  NT: ["Yellowknife"],
  NU: ["Iqaluit"],
};

/** Lowercase, no accents, words split by single spaces: "Montréal, QC" gives "montreal qc". */
export function foldPlace(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Names to look for, longest first, so "Richmond Hill" wins over "Richmond".
const PLACE_NAMES: [string, ProvinceCode][] = ([
  ...PROVINCE_CODE_LIST.map((code): [string, ProvinceCode] => [PROVINCES[code], code]),
  ["Newfoundland", "NL"],
  ["Labrador", "NL"],
  ...PROVINCE_CODE_LIST.flatMap((code) =>
    CITY_PROVINCES[code].map((city): [string, ProvinceCode] => [city, code])
  ),
] as [string, ProvinceCode][])
  .map(([name, code]): [string, ProvinceCode] => [foldPlace(name), code])
  .sort((a, b) => b[0].length - a[0].length);

const CODE_AFTER_COMMA = /,\s*(ON|QC|BC|AB|SK|MB|NS|NB|PE|PEI|NL|YT|NT|NU)\b/;

/**
 * The province or territory code of a free text location, or "" when it
 * can't tell (for example "Remote, Canada").
 */
export function provinceOf(location: string): ProvinceCode | "" {
  const code = CODE_AFTER_COMMA.exec(location)?.[1];
  if (code) return code === "PEI" ? "PE" : (code as ProvinceCode);

  const folded = ` ${foldPlace(location)} `;
  const hit = PLACE_NAMES.find(([name]) => folded.includes(` ${name} `));
  return hit ? hit[1] : "";
}
