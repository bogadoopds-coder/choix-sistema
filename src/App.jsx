import { useState } from "react";
import PresupuestosModule from "./modules/budgets/PresupuestosModule";
import DashboardModule from "./modules/dashboard/DashboardModule";
import ChatModule from "./modules/chat/ChatModule";
import { PresupuestosModulePrecios } from "./modules/prices/PricesModule";
import CertificacionesModule from "./modules/certificaciones/CertificacionesModule";
import ComprasModule from "./modules/compras/ComprasModule";
import SeguimientoCertificadosModule from "./modules/seguimiento-certificados/SeguimientoCertificadosModule";
import { BASE } from "./data/priceBase";

// ═══════════════════════════════════════════════════════════════════════════════
// CHOIX CONSTRUCTORA — SISTEMA INTEGRADO
// ═══════════════════════════════════════════════════════════════════════════════


const NAV_ITEMS = [
  { id: "dashboard",   icon: "📊", label: "Dashboard",       sub: "Resumen general" },
  { id: "chat",        icon: "🤖", label: "Agente IA",      sub: "Asistente" },
  { id: "presupuesto", icon: "📋", label: "Presupuestos",   sub: "Obras + precios" },
  { id: "parte",       icon: "🧾", label: "Parte Diario",   sub: "Registro diario" },
  { id: "rfi",         icon: "❓", label: "RFIs",           sub: "Consultas técnicas" },
  { id: "compras",     icon: "📦", label: "Órd. Compra",    sub: "Proveedores" },
  { id: "cert",        icon: "📈", label: "Certificaciones",sub: "Avance económico" },
  { id: "segcert",     icon: "🚦", label: "Seguim. Cert.", sub: "Cobros x organismo" },
  { id: "sh",          icon: "🦺", label: "SHyMA",          sub: "Seguridad e higiene" },
  { id: "calidad",     icon: "✅", label: "Calidad",        sub: "No conformidades" },
  { id: "precios",     icon: "💲", label: "Base Precios",   sub: "948 ítems + historial" },
];

// Modules that use chat IA (direct to ChatModule with pre-sent command)
const CHAT_MODULES = { parte: "/nuevo_parte", rfi: "/nuevo_RFI", sh: "/nueva_incidencia_SH", calidad: "/nueva_NC" };

export default function ChoixIntegrado() {
  const [activeModule, setActiveModule] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatInitCmd, setChatInitCmd] = useState(null);

  const TEAL = "#1A9B7B";
  const BG = "#0f1210";
  const CARD = "#141a16";
  const BORDER = "#1e2a22";
  const TEXT = "#d8e4de";
  const MUTED = "#4a6055";

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
    <div style={{ display: "flex", height: "100vh", background: BG, fontFamily: "'Inter','Segoe UI',Arial,sans-serif", color: TEXT, overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: sidebarOpen ? "200px" : "56px", minWidth: sidebarOpen ? "200px" : "56px", background: CARD, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "16px 14px 12px" : "16px 10px 12px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }} onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? (
            <div>
              <div style={{ fontSize: "8px", color: MUTED, letterSpacing: "0.25em", marginBottom: "2px" }}>CONSTRUCTORA</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontFamily: "'Arial Black',Impact,sans-serif", fontWeight: 900, fontSize: "20px", color: TEXT, letterSpacing: "-0.02em" }}>CHOI</span>
                <svg width="16" height="20" viewBox="0 0 16 20" style={{ marginBottom: "1px" }}>
                  <line x1="1" y1="1" x2="15" y2="19" stroke={TEAL} strokeWidth="3.2" strokeLinecap="round"/>
                  <line x1="15" y1="1" x2="1" y2="19" stroke={TEXT} strokeWidth="3.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ height: "2px", background: TEAL, borderRadius: "1px", marginTop: "2px", width: "60px" }} />
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <svg width="22" height="26" viewBox="0 0 22 26" style={{ display: "block", margin: "0 auto" }}>
                <line x1="2" y1="2" x2="20" y2="24" stroke={TEAL} strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="20" y1="2" x2="2" y2="24" stroke={TEXT} strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeModule === item.id || (CHAT_MODULES[item.id] && activeModule === "chat" && chatInitCmd === CHAT_MODULES[item.id]);
            return (
              <div key={item.id} onClick={() => navigate(item.id)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: sidebarOpen ? "9px 14px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", cursor: "pointer", background: isActive ? `${TEAL}18` : "transparent", borderLeft: isActive ? `3px solid ${TEAL}` : "3px solid transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#1e2a22"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: isActive ? TEAL : TEXT, lineHeight: 1.2 }}>{item.label}</div>
                    <div style={{ fontSize: "10px", color: MUTED, marginTop: "1px" }}>{item.sub}</div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{ padding: "12px 14px", borderTop: `1px solid ${BORDER}`, fontSize: "10px", color: MUTED }}>
            <div>+60 años de trayectoria</div>
            <div style={{ color: TEAL, marginTop: "2px" }}>choixconstructora.com.ar</div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top header */}
        <div style={{ background: CARD, borderBottom: `2px solid ${TEAL}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: TEXT }}>
              {NAV_ITEMS.find(n => n.id === activeModule)?.icon} {NAV_ITEMS.find(n => n.id === activeModule)?.label}
            </div>
            <div style={{ fontSize: "11px", color: MUTED }}>{NAV_ITEMS.find(n => n.id === activeModule)?.sub}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "11px", color: "#22c55e" }}>EN LÍNEA</span>
          </div>
        </div>

        {/* Module content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeModule === "dashboard" && <DashboardModule />}
          {activeModule === "chat" && <ChatModule key={chatInitCmd} initCmd={chatInitCmd} />}
          {activeModule === "presupuesto" && <PresupuestosModule BASE={BASE} />}
          {activeModule === "cert" && <CertificacionesModule BASE={BASE} />}
          {activeModule === "compras" && <ComprasModule />}
          {activeModule === "segcert" && <SeguimientoCertificadosModule />}
          {activeModule === "precios" && <PresupuestosModulePrecios BASE={BASE} />}
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-4px);opacity:1} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#0f1210}
        ::-webkit-scrollbar-thumb{background:#1e2a22;border-radius:2px}
      `}</style>
    </div>
  );
}
