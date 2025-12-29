export type IsoCountry = {
  code: string;
  name: string;
};

const ISO_COUNTRY_CODES = [
  'AF','AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ',
  'BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW','BV','BR','IO','BN','BG','BF','BI',
  'CV','KH','CM','CA','KY','CF','TD','CL','CN','CX','CC','CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ',
  'DK','DJ','DM','DO',
  'EC','EG','SV','GQ','ER','EE','ET',
  'FK','FO','FJ','FI','FR','GF','PF','TF',
  'GA','GM','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY',
  'HT','HM','VA','HN','HK','HU',
  'IS','IN','ID','IR','IQ','IE','IM','IL','IT',
  'JM','JP','JE','JO',
  'KZ','KE','KI','KP','KR','KW','KG',
  'LA','LV','LB','LS','LR','LY','LI','LT','LU',
  'MO','MK','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS','MA','MZ','MM',
  'NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MP','NO',
  'OM',
  'PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR',
  'QA',
  'RE','RO','RU','RW',
  'BL','SH','KN','LC','MF','PM','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','SS','ES','LK','SD','SR','SJ','SZ','SE','CH','SY',
  'TW','TJ','TZ','TH','TL','TG','TK','TO','TT','TN','TR','TM','TC','TV',
  'UG','UA','AE','GB','US','UM','UY','UZ',
  'VU','VE','VN','VG','VI',
  'WF','EH','YE','ZM','ZW'
];

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom',
  US: 'United States',
  IE: 'Ireland',
  AE: 'United Arab Emirates'
};

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  british: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  usa: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'united states of america': 'US',
  uae: 'AE',
  'republic of ireland': 'IE',
  eire: 'IE'
};

export const DEFAULT_NATIONALITY_CODE = 'GB';

const displayNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

export const ISO_COUNTRIES: IsoCountry[] = ISO_COUNTRY_CODES.map((code) => {
  const name = (displayNames ? displayNames.of(code) : null) || FALLBACK_COUNTRY_NAMES[code] || code;
  return { code, name };
}).sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_BY_CODE = new Map(ISO_COUNTRIES.map((country) => [country.code, country]));
const COUNTRY_BY_NAME = new Map(ISO_COUNTRIES.map((country) => [country.name.toLowerCase(), country.code]));

export function normalizeIsoCountryCode(value?: string | null): string {
  if (!value) return DEFAULT_NATIONALITY_CODE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_NATIONALITY_CODE;

  const upper = trimmed.toUpperCase();
  if (COUNTRY_BY_CODE.has(upper)) return upper;

  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const nameMatch = COUNTRY_BY_NAME.get(trimmed.toLowerCase());
  if (nameMatch) return nameMatch;

  return DEFAULT_NATIONALITY_CODE;
}

export function getCountryLabel(code?: string | null): string {
  if (!code) return '';
  const normalized = normalizeIsoCountryCode(code);
  const match = COUNTRY_BY_CODE.get(normalized);
  return match?.name || normalized;
}
