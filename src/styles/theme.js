// Praxia Consulting — design tokens
export const COLORS = {
  bg: "#080c0a",
  card: "#0c100e",
  border: "rgba(240,237,230,0.08)",
  text: "#f0ede6",
  muted: "rgba(240,237,230,0.55)",
  mutedDim: "rgba(240,237,230,0.18)",
  subtle: "rgba(240,237,230,0.04)",
  gold: "#3ecfa0",
  goldDim: "rgba(62,207,160,0.08)",
  verde: "#22c55e",
  amarillo: "#f59e0b",
  rojo: "#ef4444",
  blue: "#3ecfa0",
  purple: "#7ecfb8",
  teal: "#3ecfa0",
  tealDark: "#2da87f",
  tealDim: "rgba(62,207,160,0.08)",
};

export const FONTS = {
  heading: "'Space Grotesk', sans-serif",
  body: "'DM Sans', sans-serif",
};

export const S = {
  app: {
    minHeight: "auto",
    background: COLORS.bg,
    fontFamily: FONTS.body,
    color: COLORS.text,
    fontSize: "13px",
  },
  panel: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    padding: "16px",
  },
  input: {
    background: COLORS.subtle,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "6px",
    color: COLORS.text,
    padding: "7px 10px",
    fontFamily: "inherit",
    fontSize: "12px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: (v = "gold", sm = false) => ({
    background:
      v === "gold"
        ? COLORS.gold
        : v === "red"
        ? "#ef444420"
        : v === "blue"
        ? "rgba(62,207,160,0.12)"
        : "transparent",
    color:
      v === "gold"
        ? COLORS.bg
        : v === "red"
        ? COLORS.rojo
        : v === "blue"
        ? COLORS.teal
        : COLORS.muted,
    border:
      v === "gold"
        ? "none"
        : `1px solid ${
            v === "red"
              ? COLORS.rojo
              : v === "blue"
              ? COLORS.teal
              : COLORS.border
          }`,
    borderRadius: "6px",
    padding: sm ? "4px 10px" : "7px 14px",
    fontSize: sm ? "11px" : "12px",
    fontFamily: "inherit",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
  }),
  tag: (c) => ({
    background: `${c}18`,
    color: c,
    border: `1px solid ${c}40`,
    borderRadius: "4px",
    padding: "2px 7px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
  }),
  label: {
    fontSize: "10px",
    color: COLORS.muted,
    letterSpacing: "0.08em",
    marginBottom: "4px",
    display: "block",
    textTransform: "uppercase",
    fontFamily: FONTS.heading,
  },
  th: {
    padding: "8px 10px",
    textAlign: "left",
    fontSize: "10px",
    color: COLORS.muted,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: "nowrap",
    fontFamily: FONTS.heading,
  },
  td: {
    padding: "7px 10px",
    borderBottom: `1px solid ${COLORS.border}`,
    verticalAlign: "middle",
  },
};
