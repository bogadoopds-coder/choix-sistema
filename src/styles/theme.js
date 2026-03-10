export const COLORS = {
  // Choix brand colors (from brochure)
  bg: "#0f1210",
  card: "#141a16",
  border: "#1e2a22",
  gold: "#1A9B7B", // Choix teal green — replaces gold throughout
  goldDim: "#1A9B7B22",
  text: "#d8e4de",
  muted: "#4a6055",
  subtle: "#182018",
  verde: "#22c55e",
  amarillo: "#f59e0b",
  rojo: "#ef4444",
  blue: "#3b9b82",
  purple: "#5b8a7b",
  // Logo accent
  teal: "#1A9B7B",
  tealDark: "#127a60",
  tealDim: "#1A9B7B18",
};

export const S = {
  app: {
    minHeight: "auto",
    background: COLORS.bg,
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
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
        ? "#3b82f620"
        : "transparent",
    color:
      v === "gold"
        ? COLORS.bg
        : v === "red"
        ? COLORS.rojo
        : v === "blue"
        ? COLORS.blue
        : COLORS.muted,
    border:
      v === "gold"
        ? "none"
        : `1px solid ${
            v === "red"
              ? COLORS.rojo
              : v === "blue"
              ? COLORS.blue
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
  },
  td: {
    padding: "7px 10px",
    borderBottom: `1px solid ${COLORS.border}15`,
    verticalAlign: "middle",
  },
};

