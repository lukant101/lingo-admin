import type {
  CdnLanguage,
  CdnLanguagesDoc,
  CdnLanguageVariant,
  LanguageSearchResult,
} from "@/types/cdn-lang";

const CDN_URL = "https://cdn.lingohouse.app/data/languages/en-ca.json";
const MAX_RESULTS = 20;

let languages: CdnLanguage[] = [];
let variantsMap = new Map<string, CdnLanguageVariant[]>();
let codesWithVariants = new Set<string>();

const populateFromData = (data: CdnLanguagesDoc): void => {
  languages = data.languages;
  variantsMap = new Map(Object.entries(data.variants ?? {}));
  codesWithVariants = new Set(variantsMap.keys());
};

export const loadLanguages = async (): Promise<void> => {
  try {
    const response = await fetch(CDN_URL);
    if (!response.ok) {
      console.warn(`[languages] CDN fetch failed: ${response.status}`);
      return;
    }
    const data: CdnLanguagesDoc = await response.json();
    populateFromData(data);
  } catch (err) {
    console.warn("[languages] Failed to load:", err);
  }
};

export const searchLanguages = (query: string): LanguageSearchResult[] => {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const matches: CdnLanguage[] = [];

  for (const lang of languages) {
    for (const alias of lang.aliases) {
      if (alias.startsWith(normalized)) {
        matches.push(lang);
        break;
      }
    }
  }

  const results: LanguageSearchResult[] = matches.map((lang) => ({
    code: lang.code,
    name: lang.name,
    hasVariants: codesWithVariants.has(lang.code),
  }));

  results.sort((a, b) => {
    const aExact = a.code === normalized ? 0 : 1;
    const bExact = b.code === normalized ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aNamePrefix = a.name.toLowerCase().startsWith(normalized) ? 0 : 1;
    const bNamePrefix = b.name.toLowerCase().startsWith(normalized) ? 0 : 1;
    if (aNamePrefix !== bNamePrefix) return aNamePrefix - bNamePrefix;

    return a.name.localeCompare(b.name);
  });

  return results.slice(0, MAX_RESULTS);
};

export const getVariants = (code: string): CdnLanguageVariant[] => {
  return variantsMap.get(code) || [];
};

export const getVariantName = (variantCode: string): string => {
  for (const variants of variantsMap.values()) {
    const match = variants.find((v) => v.code === variantCode);
    if (match)
      return match.variantName
        ? `${match.name} (${match.variantName})`
        : match.name;
  }
  // Fall back to base language name
  const lang = languages.find((l) => l.code === variantCode);
  if (lang) return lang.name;
  return variantCode;
};

export const isLoaded = (): boolean => {
  return languages.length > 0;
};
