import { DECK_LEVEL } from "@/lib/constants";

export type LangCode = string;

export type FirestoreLangDoc = {
  langs: {
    langCode: LangCode;
    name: string;
    normName: string;
    speechToText: boolean;
  }[];
  numLangs: number;
  updatedAt: string; // ISO8601 UTC timestamp string
};

export type Language = {
  code: LangCode;
  name: string;
  normName: string;
  speechToText: boolean;
};

export type DeckLevel = (typeof DECK_LEVEL)[keyof typeof DECK_LEVEL];
