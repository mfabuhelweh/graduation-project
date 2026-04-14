import { I18nManager } from "react-native";

const appPrefersRtl = true;

export const isRTL = appPrefersRtl || I18nManager.isRTL;

export const rtlText = {
  writingDirection: "rtl" as const,
  textAlign: "right" as const
};

export const ltrText = {
  writingDirection: "ltr" as const,
  textAlign: "left" as const
};

export function rowDirection(reverse = true) {
  return reverse ? ("row-reverse" as const) : ("row" as const);
}
