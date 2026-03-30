import type { SchemaIssueCatalog } from '../error/catalog-types.js';
import { deDECatalog } from '../error/locales/de.js';
import { enUSCatalog } from '../error/locales/en.js';
import { esESCatalog } from '../error/locales/es.js';
import { frFRCatalog } from '../error/locales/fr.js';
import { jaJPCatalog } from '../error/locales/ja.js';
import { koKRCatalog } from '../error/locales/ko.js';
import { ptBRCatalog } from '../error/locales/pt.js';
import { zhHansCatalog, zhHantCatalog } from '../error/locales/zh.js';
import { LocaleCodes, type LocaleCode } from '../shared/locale.js';

export const ar_001 = enUSCatalog;
export const bn_BD = enUSCatalog;
export const cs_CZ = enUSCatalog;
export const de_DE = deDECatalog;
export const el_GR = enUSCatalog;
export const en_US = enUSCatalog;
export const es_419 = esESCatalog;
export const es_AR = esESCatalog;
export const es_ES = esESCatalog;
export const es_MX = esESCatalog;
export const fa_IR = enUSCatalog;
export const fil_PH = enUSCatalog;
export const fr_CA = frFRCatalog;
export const fr_FR = frFRCatalog;
export const ha_NG = enUSCatalog;
export const hi_IN = enUSCatalog;
export const hu_HU = enUSCatalog;
export const id_ID = enUSCatalog;
export const it_IT = enUSCatalog;
export const ja_JP = jaJPCatalog;
export const ko_KR = koKRCatalog;
export const ms_MY = enUSCatalog;
export const nl_NL = enUSCatalog;
export const pl_PL = enUSCatalog;
export const pt_BR = ptBRCatalog;
export const pt_PT = ptBRCatalog;
export const ro_RO = enUSCatalog;
export const ru_RU = enUSCatalog;
export const sv_SE = enUSCatalog;
export const sw_TZ = enUSCatalog;
export const th_TH = enUSCatalog;
export const tr_TR = enUSCatalog;
export const uk_UA = enUSCatalog;
export const ur_PK = enUSCatalog;
export const vi_VN = enUSCatalog;
export const yo_NG = enUSCatalog;
export const zh_Hans = zhHansCatalog;
export const zh_Hant = zhHantCatalog;

export const OfficialLocaleCatalogs = {
  [LocaleCodes.ar_001]: ar_001,
  [LocaleCodes.bn_BD]: bn_BD,
  [LocaleCodes.cs_CZ]: cs_CZ,
  [LocaleCodes.de_DE]: de_DE,
  [LocaleCodes.el_GR]: el_GR,
  [LocaleCodes.en_US]: en_US,
  [LocaleCodes.es_419]: es_419,
  [LocaleCodes.es_AR]: es_AR,
  [LocaleCodes.es_ES]: es_ES,
  [LocaleCodes.es_MX]: es_MX,
  [LocaleCodes.fa_IR]: fa_IR,
  [LocaleCodes.fil_PH]: fil_PH,
  [LocaleCodes.fr_CA]: fr_CA,
  [LocaleCodes.fr_FR]: fr_FR,
  [LocaleCodes.ha_NG]: ha_NG,
  [LocaleCodes.hi_IN]: hi_IN,
  [LocaleCodes.hu_HU]: hu_HU,
  [LocaleCodes.id_ID]: id_ID,
  [LocaleCodes.it_IT]: it_IT,
  [LocaleCodes.ja_JP]: ja_JP,
  [LocaleCodes.ko_KR]: ko_KR,
  [LocaleCodes.ms_MY]: ms_MY,
  [LocaleCodes.nl_NL]: nl_NL,
  [LocaleCodes.pl_PL]: pl_PL,
  [LocaleCodes.pt_BR]: pt_BR,
  [LocaleCodes.pt_PT]: pt_PT,
  [LocaleCodes.ro_RO]: ro_RO,
  [LocaleCodes.ru_RU]: ru_RU,
  [LocaleCodes.sv_SE]: sv_SE,
  [LocaleCodes.sw_TZ]: sw_TZ,
  [LocaleCodes.th_TH]: th_TH,
  [LocaleCodes.tr_TR]: tr_TR,
  [LocaleCodes.uk_UA]: uk_UA,
  [LocaleCodes.ur_PK]: ur_PK,
  [LocaleCodes.vi_VN]: vi_VN,
  [LocaleCodes.yo_NG]: yo_NG,
  [LocaleCodes.zh_Hans]: zh_Hans,
  [LocaleCodes.zh_Hant]: zh_Hant,
} satisfies Record<LocaleCode, SchemaIssueCatalog>;

export function LocaleCatalogEntries(): Array<[LocaleCode, SchemaIssueCatalog]> {
  return Object.values(LocaleCodes).map((locale) => [locale, OfficialLocaleCatalogs[locale]]);
}

const LocalePacks = OfficialLocaleCatalogs;

export { LocalePacks };
export default LocalePacks;
