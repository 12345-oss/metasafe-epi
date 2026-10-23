import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { NivelRisco, Severidade, StatusAlerta } from "../lib/types";

type TipoBadge = "success" | "warning" | "danger" | "info" | "neutral";

export function Badge({ tipo = "info", children }: { tipo?: TipoBadge; children: ReactNode }) {
  return <span className={`badge badge-${tipo}`}>{children}</span>;
}

export const corSeveridade: Record<Severidade, TipoBadge> = { baixa: "success", media: "warning", critica: "danger" };
export const corVarSeveridade: Record<Severidade, string> = {
  baixa: "var(--success)",
  media: "var(--warning)",
  critica: "var(--danger)",
};

export function SeveridadeBadge({ severidade, tecnico }: { severidade: Severidade; tecnico?: boolean }) {
  if (tecnico) return <Badge tipo="info">Técnica</Badge>;
  const rot = { baixa: "Baixa", media: "Média", critica: "Crítica" }[severidade];
  return <Badge tipo={corSeveridade[severidade]}>{rot}</Badge>;
}

export function StatusBadge({ status }: { status: StatusAlerta }) {
  const mapa: Record<StatusAlerta, [TipoBadge, string]> = {
    ativo: ["danger", "Ativo"],
    em_tratamento: ["warning", "Em tratamento"],
    encerrado: ["success", "Encerrado"],
    escalado: ["info", "Escalado"],
  };
  const [t, r] = mapa[status];
  return <Badge tipo={t}>{r}</Badge>;
}

export function NivelBadge({ nivel }: { nivel: NivelRisco }) {
  const mapa: Record<NivelRisco, [TipoBadge, string]> = { medio: ["info", "Risco médio"], alto: ["warning", "Risco alto"], critico: ["danger", "Risco crítico"] };
  const [t, r] = mapa[nivel];
  return <Badge tipo={t}>{r}</Badge>;
}

export function SeveridadeMarca({ severidade, tecnico }: { severidade: Severidade; tecnico?: boolean }) {
  return <i className="severity" style={{ ["--severity-color" as string]: tecnico ? "var(--info)" : corVarSeveridade[severidade] }} />;
}

export function PageHead({ eyebrow, titulo, descricao, acoes }: { eyebrow: string; titulo: ReactNode; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="page-actions">{acoes}</div>}
    </div>
  );
}

export function Voltar({ para, rotulo = "Voltar" }: { para: string; rotulo?: string }) {
  const nav = useNavigate();
  return (
    <button className="back-button" onClick={() => nav(para)}>
      ← {rotulo}
    </button>
  );
}

export function InfoBanner({ tipo, icone = "i", titulo, children }: { tipo?: "warning" | "danger"; icone?: string; titulo: string; children?: ReactNode }) {
  return (
    <div className={`info-banner ${tipo ?? ""}`}>
      <b>{icone}</b>
      <div>
        <strong>{titulo}</strong>
        {children && <span>{children}</span>}
      </div>
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="estado-vazio">
      <span className="spinner" aria-hidden />
      {texto}
    </div>
  );
}

export function Erro({ mensagem, tentar }: { mensagem: string; tentar?: () => void }) {
  return (
    <div className="info-banner danger">
      <b>!</b>
      <div>
        <strong>Não foi possível carregar os dados</strong>
        <span>{mensagem}</span>
      </div>
      {tentar && (
        <button className="button button-secondary" style={{ marginLeft: "auto" }} onClick={tentar}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="estado-vazio">{children}</div>;
}

export function Kpi({ rotulo, valor, sufixo, tendencia, alerta, cor }: { rotulo: string; valor: ReactNode; sufixo?: string; tendencia?: ReactNode; alerta?: boolean; cor?: "success" | "danger" | "info" | "warning" }) {
  const tint = { success: "#e8f6ec", danger: "#fff0ef", info: "#edf5ff", warning: "#fff3df" }[cor ?? "info"];
  const dot = { success: "var(--success)", danger: "var(--danger)", info: "var(--info)", warning: "var(--warning)" }[cor ?? "success"];
  const bg = { success: "var(--success-bg)", danger: "var(--danger-bg)", info: "var(--info-bg)", warning: "var(--warning-bg)" }[cor ?? "success"];
  return (
    <article className="card kpi" style={{ ["--kpi-tint" as string]: tint }}>
      <div className="kpi-head">
        <span className="kpi-label">{rotulo}</span>
        <i className="status-dot" style={{ background: dot, boxShadow: `0 0 0 4px ${bg}` }} />
      </div>
      <div className="kpi-value">
        {valor} {sufixo && <small>{sufixo}</small>}
      </div>
      {tendencia && <span className={`trend ${alerta ? "warning" : ""}`}>{tendencia}</span>}
    </article>
  );
}

export function Progresso({ rotulo, valor, direita, meta }: { rotulo: ReactNode; valor: number | null; direita?: ReactNode; meta?: number }) {
  const abaixo = meta !== undefined && valor !== null && valor < meta;
  return (
    <div className="progress-row">
      <span>{rotulo}</span>
      <div className="progress-track">
        <span style={{ width: `${Math.max(0, Math.min(100, valor ?? 0))}%`, background: abaixo ? "linear-gradient(90deg,#e8a33d,#b86200)" : undefined }} />
      </div>
      <strong>{direita ?? (valor === null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`)}</strong>
    </div>
  );
}

export function Modal({ titulo, aberto, aoFechar, children, rodape }: { titulo: string; aberto: boolean; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="section-row">
          <h2>{titulo}</h2>
          <button className="icon-button" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
        {rodape && <div className="form-actions">{rodape}</div>}
      </div>
    </div>
  );
}

export function Paginacao({ pagina, total, porPagina, aoMudar }: { pagina: number; total: number; porPagina: number; aoMudar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div className="paginacao">
      <span>
        {total} registro{total === 1 ? "" : "s"} · página {pagina} de {paginas}
      </span>
      <div>
        <button className="button button-secondary" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          ← Anterior
        </button>
        <button className="button button-secondary" disabled={pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>
          Próxima →
        </button>
      </div>
    </div>
  );
}
