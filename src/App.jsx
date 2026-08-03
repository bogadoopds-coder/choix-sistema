import { useState } from "react";
import PresupuestosModule from "./modules/budgets/PresupuestosModule";
import DashboardModule from "./modules/dashboard/DashboardModule";
import ChatModule from "./modules/chat/ChatModule";
import { PresupuestosModulePrecios } from "./modules/prices/PricesModule";
import CertificacionesModule from "./modules/certificaciones/CertificacionesModule";
import ComprasModule from "./modules/compras/ComprasModule";
import DesarrollosModule from "./modules/desarrollos/DesarrollosModule";
import ClientesModule from "./modules/clientes/ClientesModule";
import MercadoModule from "./modules/mercado/MercadoModule";
import FactibilidadModule from "./modules/factibilidad/FactibilidadModule";
import { BASE } from "./data/priceBase";
import { COLORS, FONTS } from "./styles/theme";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";

function PraxiaLogo({ size = "md", collapsed = false }) {
  const fontSize = size === "lg" ? "22px" : size === "sm" ? "14px" : "18px";
  if (collapsed) {
    return (
      <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: "16px", color: COLORS.text }}>
        P<span style={{ color: COLORS.teal }}>.</span>
      </span>
    );
  }
  return (
    <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize, color: COLORS.text, letterSpacing: "-0.02em" }}>
      Praxia<span style={{ color: COLORS.teal }}>.</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRAXIA · OBRAS — SISTEMA INTEGRADO
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: "dashboard",   icon: "📊", label: "Dashboard",       sub: "Resumen general" },
  { id: "chat",        icon: "🤖", label: "Agente IA",      sub: "Asistente" },
  { id: "presupuesto", icon: "📋", label: "Presupuestos",   sub: "Obras + precios" },
  { id: "compras",     icon: "📦", label: "Órd. Compra",    sub: "Proveedores" },
  { id: "cert",        icon: "📈", label: "Certificaciones",sub: "Avance económico" },
  { id: "precios",     icon: "💲", label: "Base Precios",   sub: "948 ítems + historial" },
  { id: "desarrollos", icon: "🏢", label: "Desarrollos",    sub: "Inmobiliaria" },
  { id: "clientes",    icon: "👥", label: "Clientes",       sub: "CRM" },
  { id: "mercado",     icon: "🔎", label: "Mercado",        sub: "Precios de zona" },
  { id: "factibilidad", icon: "📐", label: "Factibilidad",  sub: "Viabilidad de terreno" },
];

const CHAT_MODULES = { parte: "/nuevo_parte", rfi: "/nuevo_RFI", sh: "/nueva_incidencia_SH", calidad: "/nueva_NC" };

function PraxiaApp() {
  const [activeModule, setActiveModule] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatInitCmd, setChatInitCmd] = useState(null);
  const { user, logout } = useAuth();

  function navigate(id) {
    if (CHAT_MODULES[id]) {
      setChatInitCmd(CHAT_MODULES[id]);
      setActiveModule("chat");
    } else {
      setChatInitCmd(null);
      setActiveModule(id);
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: FONTS.body, color: COLORS.text, overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: sidebarOpen ? "200px" : "56px", minWidth: sidebarOpen ? "200px" : "56px", background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "16px 14px 12px" : "16px 10px 12px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }} onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: "8px", color: COLORS.muted, letterSpacing: "0.25em", marginBottom: "4px", fontFamily: FONTS.heading, textTransform: "uppercase" }}>Obras</div>
              <PraxiaLogo size="lg" />
              <div style={{ fontSize: "10px", color: COLORS.mutedDim, marginTop: "4px", letterSpacing: "0.04em" }}>Praxia · Obras</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <PraxiaLogo collapsed />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeModule === item.id || (CHAT_MODULES[item.id] && activeModule === "chat" && chatInitCmd === CHAT_MODULES[item.id]);
            return (
              <div key={item.id} onClick={() => navigate(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: sidebarOpen ? "9px 14px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", cursor: "pointer", background: isActive ? COLORS.tealDim : "transparent", borderLeft: isActive ? `3px solid ${COLORS.teal}` : "3px solid transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = COLORS.subtle; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: isActive ? COLORS.teal : COLORS.text, lineHeight: 1.2, fontFamily: FONTS.heading }}>{item.label}</div>
                    <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "1px" }}>{item.sub}</div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${COLORS.border}`, fontSize: "10px", color: COLORS.muted }}>
            <div>Gestión inteligente de obras</div>
            <div style={{ color: COLORS.teal, marginTop: "2px" }}>praxiaconsulting.com.ar</div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top header */}
        <div style={{ background: COLORS.card, borderBottom: `2px solid ${COLORS.teal}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: COLORS.text, fontFamily: FONTS.heading }}>
              {NAV_ITEMS.find(n => n.id === activeModule)?.icon} {NAV_ITEMS.find(n => n.id === activeModule)?.label}
            </div>
            <div style={{ fontSize: "11px", color: COLORS.muted }}>{NAV_ITEMS.find(n => n.id === activeModule)?.sub}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <PraxiaLogo size="sm" />
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: COLORS.verde }} />
            <span style={{ fontSize: "11px", color: COLORS.verde }}>EN LÍNEA</span>
            <span style={{ fontSize: "11px", color: COLORS.muted, marginLeft: "8px" }}>{user?.email}</span>
            <button
              onClick={logout}
              style={{ fontSize: "11px", color: COLORS.text, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", marginLeft: "4px" }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* Module content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeModule === "dashboard" && <DashboardModule />}
          {activeModule === "chat" && <ChatModule key={chatInitCmd} initCmd={chatInitCmd} />}
          {activeModule === "presupuesto" && <PresupuestosModule BASE={BASE} />}
          {activeModule === "cert" && <CertificacionesModule BASE={BASE} />}
          {activeModule === "compras" && <ComprasModule BASE={BASE} />}
          {activeModule === "precios" && <PresupuestosModulePrecios BASE={BASE} />}
          {activeModule === "desarrollos" && <DesarrollosModule />}
          {activeModule === "clientes" && <ClientesModule />}
          {activeModule === "mercado" && <MercadoModule />}
          {activeModule === "factibilidad" && <FactibilidadModule />}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${COLORS.bg}}
        ::-webkit-scrollbar-thumb{background:${COLORS.border};border-radius:2px}
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, orgId, rol, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#15231C", color: "#F4F1E9", fontFamily: "Inter, system-ui, sans-serif" }}>
        Cargando...
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <PraxiaApp />;
}
