import { Settings } from '../shared/utils.js';
import { Clone } from '../value/clone.js';
import { Create } from '../value/create.js';
import { Hash } from '../value/hash.js';
import { Mutate } from '../value/mutate.js';

const LOCALES = {
  ar_001: 'ar_001',
  bn_BD: 'bn_BD',
  cs_CZ: 'cs_CZ',
  de_DE: 'de_DE',
  el_GR: 'el_GR',
  en_US: 'en_US',
  es_419: 'es_419',
  es_AR: 'es_AR',
  es_ES: 'es_ES',
  es_MX: 'es_MX',
  fa_IR: 'fa_IR',
  fil_PH: 'fil_PH',
  fr_CA: 'fr_CA',
  fr_FR: 'fr_FR',
  ha_NG: 'ha_NG',
  hi_IN: 'hi_IN',
  hu_HU: 'hu_HU',
  id_ID: 'id_ID',
  it_IT: 'it_IT',
  ja_JP: 'ja_JP',
  ko_KR: 'ko_KR',
  ms_MY: 'ms_MY',
  nl_NL: 'nl_NL',
  pl_PL: 'pl_PL',
  pt_BR: 'pt_BR',
  pt_PT: 'pt_PT',
  ro_RO: 'ro_RO',
  ru_RU: 'ru_RU',
  sv_SE: 'sv_SE',
  sw_TZ: 'sw_TZ',
  th_TH: 'th_TH',
  tr_TR: 'tr_TR',
  uk_UA: 'uk_UA',
  ur_PK: 'ur_PK',
  vi_VN: 'vi_VN',
  yo_NG: 'yo_NG',
  zh_Hans: 'zh_Hans',
  zh_Hant: 'zh_Hant',
} as const;

type LocaleCode = (typeof LOCALES)[keyof typeof LOCALES];

let currentLocale: LocaleCode = LOCALES.en_US;

export const Arguments = {
  Match(expected: readonly string[], actual: readonly string[] = Bun.argv.slice(2)): boolean {
    return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  },
};

export const Environment = {
  CanAccelerate(): boolean {
    return typeof Bun !== 'undefined';
  },
};

export const Hashing = {
  Hash,
  HashCode(value: unknown): number {
    return Number(BigInt.asUintN(32, Hash(value)));
  },
};

export const Locale = {
  ...LOCALES,
  Get(): LocaleCode {
    return currentLocale;
  },
  Set(locale: LocaleCode): void {
    currentLocale = locale;
  },
  Reset(): void {
    currentLocale = LOCALES.en_US;
  },
};

export const Memory = {
  Assign<TTarget extends object, TSource extends object>(target: TTarget, source: TSource): TTarget & TSource {
    return Object.assign(target, source);
  },
  Clone,
  Create,
  Discard(value: unknown): void {
    if (Array.isArray(value)) {
      value.length = 0;
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        delete (value as Record<string, unknown>)[key];
      }
    }
  },
  Metrics(value: unknown): { bytes: number; keys: number } {
    const serialized = JSON.stringify(value);
    const bytes = new TextEncoder().encode(serialized ?? '').length;
    const keys = typeof value === 'object' && value !== null ? Object.keys(value).length : 0;
    return { bytes, keys };
  },
  Update(target: unknown, source: unknown): void {
    Mutate(target, source);
  },
};

export { Settings };

const System = {
  Arguments,
  Environment,
  Hashing,
  Locale,
  Memory,
  Settings,
};

export { System };
