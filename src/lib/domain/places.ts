/** ISO 3166-1 alpha-2 codes. Names come from the browser (Intl.DisplayNames), so they follow the UI locale. */
const CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

export function countryOptions(locale = "en"): { code: string; name: string }[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Best guess at the person's country from their browser locale (e.g. en-NG → NG). */
export function guessCountry(): string | null {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && CODES.includes(region) ? region : null;
  } catch {
    return null;
  }
}

/** Every IANA zone the browser knows, labelled with its current UTC offset, sorted by offset. */
export function timeZoneOptions(now = new Date()): { zone: string; label: string }[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC"];
  const withOffset = zones.map((zone) => {
    const offset =
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const [, sign = "+", h = "0", m = "0"] = offset.match(/GMT([+-])?(\d+)?(?::(\d+))?/) ?? [];
    const minutes = (sign === "-" ? -1 : 1) * (Number(h) * 60 + Number(m));
    return { zone, minutes, label: `(${offset.replace("GMT", "UTC")}) ${zone.replaceAll("_", " ")}` };
  });
  if (!withOffset.some((z) => z.zone === "UTC")) withOffset.push({ zone: "UTC", minutes: 0, label: "(UTC) UTC" });
  return withOffset.sort((a, b) => a.minutes - b.minutes || a.zone.localeCompare(b.zone));
}
