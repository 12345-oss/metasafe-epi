import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth, useRealtime, useTempoReal, useToast } from "../lib/contexts";

interface ItemNav {
  to: string;
  simbolo: string;
  rotulo: string;
  fim?: boolean;
  badge?: boolean;
}

const NAV_GESTAO: ItemNav[] = [
  { to: "/", simbolo: "VG", rotulo: "Visão geral", fim: true },
  { to: "/monitoramento", simbolo: "AO", rotulo: "Monitoramento" },
  { to: "/operadores", simbolo: "OP", rotulo: "Operadores & EPIs" },
  { to: "/alertas", simbolo: "AL", rotulo: "Central de alertas", badge: true },
  { to: "/historico", simbolo: "HI", rotulo: "Histórico" },
  { to: "/zonas", simbolo: "ZR", rotulo: "Zonas & regras" },
  { to: "/relatorios", simbolo: "RL", rotulo: "Relatórios" },
  { to: "/terminal", simbolo: "TC", rotulo: "Terminal de campo" },
];
const NAV_OPERADOR: ItemNav[] = [{ to: "/terminal", simbolo: "TC", rotulo: "Terminal de campo" }];

const TITULOS: [RegExp, string][] = [
  [/^\/$/, "Visão geral"],
  [/^\/monitoramento/, "Monitoramento ao vivo"],
  [/^\/operadores\/novo/, "Cadastro de operador"],
  [/^\/operadores\/\d+\/editar/, "Editar operador"],
  [/^\/operadores\/\d+/, "Perfil do operador"],
  [/^\/operadores/, "Operadores & EPIs"],
  [/^\/alertas\/\d+/, "Tratamento de ocorrência"],
  [/^\/alertas/, "Central de alertas"],
  [/^\/historico/, "Histórico de ocorrências"],
  [/^\/zonas\/nova/, "Nova zona operacional"],
  [/^\/zonas\/\d+/, "Configuração da zona"],
  [/^\/zonas/, "Zonas & regras"],
  [/^\/relatorios/, "Relatórios de conformidade"],
  [/^\/terminal/, "Terminal de campo"],
  [/^\/sobre/, "Sobre o MetaSafe"],
];

export default function Layout() {
  const { usuario, sair } = useAuth();
  const { conectado } = useRealtime();
  const { mostrar } = useToast();
  const loc = useLocation();
  const nav = useNavigate();
  const [pendentes, setPendentes] = useState<number | null>(null);
  const gestao = usuario?.perfil !== "operador";

  const atualizarContador = useCallback(() => {
    if (!gestao) return;
    api<{ ativos: number; em_tratamento: number }>("/api/alertas/resumo")
      .then((r) => setPendentes(r.ativos + r.em_tratamento))
      .catch(() => undefined);
  }, [gestao]);

  useEffect(atualizarContador, [atualizarContador]);

  useTempoReal((m) => {
    if (m.tipo === "alerta_novo" || m.tipo === "alerta_atualizado") {
      atualizarContador();
      // RF08 / RN03: notificação imediata ao supervisor em alertas de severidade média ou crítica
      if (gestao && m.tipo === "alerta_novo" && m.notificar_supervisor) {
        const a = m.alerta;
        mostrar({
          tipo: "alerta",
          titulo: `${a.severidade === "critica" ? "Alerta crítico" : a.categoria === "tecnico" ? "Alerta técnico" : "Novo alerta"} · ${a.zona}`,
          mensagem: `${a.titulo}${a.operador ? ` · ${a.operador.nome}` : ""}`,
          acao: { rotulo: "Tratar", href: `/alertas/${a.id}` },
        });
      }
    }
  });

  const titulo = TITULOS.find(([re]) => re.test(loc.pathname))?.[1] ?? "MetaSafe EPI";
  const itens = gestao ? NAV_GESTAO : NAV_OPERADOR;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => nav(gestao ? "/" : "/terminal")} aria-label="Ir para o início">
          <span className="brand-mark">M</span>
          <span>
            <strong>MetaSafe</strong>
            <small>EPI Intelligence</small>
          </span>
        </button>
        <div className="sidebar-context">
          <span className="eyebrow">Unidade monitorada</span>
          <strong>Metaindústria · Planta SP</strong>
          <span className="system-live">
            <i style={conectado ? undefined : { background: "#e8a33d", boxShadow: "0 0 0 4px rgba(232,163,61,.2)" }} />
            {conectado ? "Tempo real ativo" : "Reconectando…"}
          </span>
        </div>
        <nav className="nav-list" aria-label="Navegação principal">
          {itens.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.fim} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} data-symbol={i.simbolo}>
              <span>{i.rotulo}</span>
              {i.badge && pendentes !== null && pendentes > 0 && <b className="nav-badge">{pendentes}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-note">
            <span className="mini-icon">LG</span>
            <span>
              <strong>Privacidade ativa</strong>
              <small>Sem reconhecimento facial</small>
            </span>
          </div>
          <button className="help-button" onClick={() => nav("/sobre")}>
            Sobre o MetaSafe
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>MetaSafe EPI</span>
            <b>/</b>
            <strong>{titulo}</strong>
          </div>
          <div className="topbar-actions">
            <div className="sync-state">
              <i style={conectado ? undefined : { background: "var(--warning)" }} />
              {conectado ? "Alertas em tempo real" : "Sem conexão em tempo real"}
            </div>
            <div className="profile-switcher">
              <span className="avatar">{usuario?.iniciais}</span>
              <span className="profile-copy">
                <strong>{usuario?.nome}</strong>
                <small>{usuario?.perfil_label}</small>
              </span>
              <button className="button button-quiet" onClick={sair} title="Encerrar sessão">
                Sair
              </button>
            </div>
          </div>
        </header>
        <main className="screen" key={loc.pathname}>
          <Outlet />
        </main>
      </section>
      <Toasts />
    </div>
  );
}

function Toasts() {
  const { toasts, fechar } = useToast();
  const nav = useNavigate();
  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tipo}`}>
          <b>{t.tipo === "erro" ? "!" : t.tipo === "alerta" ? "!" : "✓"}</b>
          <div>
            <strong>{t.titulo}</strong>
            <span>{t.mensagem}</span>
            {t.acao && (
              <button
                className="toast-acao"
                onClick={() => {
                  nav(t.acao!.href);
                  fechar(t.id);
                }}
              >
                {t.acao.rotulo} →
              </button>
            )}
          </div>
          <button className="toast-fechar" onClick={() => fechar(t.id)} aria-label="Fechar">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
