import type { PrismTheme } from "prism-react-renderer";

export const MONO_FONT = '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';

export const XML_VIEWER_THEME_LIGHT: PrismTheme = {
  plain: {
    color: "#1a1410",
    backgroundColor: "transparent",
  },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#7a6b59", fontStyle: "italic" } },
    { types: ["tag", "keyword"], style: { color: "#1a1410" } },
    { types: ["punctuation"], style: { color: "#4a3f33" } },
    { types: ["attr-name"], style: { color: "#b25a1f" } },
    { types: ["attr-value", "string"], style: { color: "#4f7560" } },
    { types: ["entity"], style: { color: "#b25a1f" } },
  ],
};

export const XML_VIEWER_THEME_DARK: PrismTheme = {
  plain: {
    color: "#efe7d4",
    backgroundColor: "transparent",
  },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#8a7e69", fontStyle: "italic" } },
    { types: ["tag", "keyword"], style: { color: "#efe7d4" } },
    { types: ["punctuation"], style: { color: "#b8ad97" } },
    { types: ["attr-name"], style: { color: "#e89249" } },
    { types: ["attr-value", "string"], style: { color: "#aac6b6" } },
    { types: ["entity"], style: { color: "#e89249" } },
  ],
};
