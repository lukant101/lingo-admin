export type CdnLanguage = {
  code: string;
  name: string;
  aliases: string[];
};

export type CdnLanguageVariant = {
  code: string;
  name: string;
  variantName?: string;
};

export type CdnLanguagesDoc = {
  languages: CdnLanguage[];
  variants: Record<string, CdnLanguageVariant[]>;
};

export type LanguageSearchResult = {
  code: string;
  name: string;
  hasVariants: boolean;
};
