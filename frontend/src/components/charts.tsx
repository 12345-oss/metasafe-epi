import type { Severidade } from "../lib/types";

/** Barras verticais no estilo do protótipo (percentual de conformidade por dia), com linha de meta. */
export function BarrasConformidade({ dados, meta }: { dados: { rotulo: string; valor: number | null; detalhe?: string }[]; meta?: number }) {
  const valores = dados.map((d) => d.valor).filter((v): v is number => v !== null);
  const minimo = Math.max(0, Math.floor(Math.min(...valores, meta ?? 100) / 5) * 5 - 5);
  const escala = (v: number) => ((v - minimo) / (100 - minimo)) * 100;
  return (
    <div className={`bar-chart ${dados.length > 9 ? "denso" : ""}`} style={{ position: "relative" }}>
      {meta !== undefined && (
        // 5px de padding + 20px do rótulo + altura útil das barras (165px)
        <div className="linha-meta" style={{ bottom: 25 + (escala(meta) / 100) * 165 }}>
          <span>Meta {meta}%</span>
        </div>
      )}
      {dados.map((d, i) => (
        <div className="bar-col" key={i} title={d.detalhe ?? (d.valor !== null ? `${d.valor}%` : "Sem eventos")}>
          <span
            style={{
              height: d.valor === null ? 2 : `${Math.max(4, escala(d.valor))}%`,
              background: d.valor !== null && meta !== undefined && d.valor < meta ? "linear-gradient(180deg,#e8a33d,#b86200)" : undefined,
              opacity: d.valor === null ? 0.25 : 1,
            }}
          />
          <b>{d.rotulo}</b>
        </div>
      ))}
    </div>
  );
}

/** Barras simples de contagem (ex.: alertas por dia). */
export function BarrasContagem({ dados }: { dados: { rotulo: string; valor: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <div className="mini-barras">
      {dados.map((d) => (
        <div key={d.rotulo} title={`${d.rotulo}: ${d.valor}`}>
          <span style={{ height: `${(d.valor / max) * 100}%` }} />
          <b>{d.valor}</b>
        </div>
      ))}
    </div>
  );
}

const CORES: Record<Severidade, string> = { baixa: "var(--success)", media: "var(--warning)", critica: "var(--danger)" };
const ROTULOS: Record<Severidade, string> = { baixa: "Baixa", media: "Média", critica: "Crítica" };

export function DonutSeveridade({ dados }: { dados: { severidade: Severidade; total: number }[] }) {
  const total = dados.reduce((s, d) => s + d.total, 0);
  let acc = 0;
  const partes = dados.map((d) => {
    const ini = (acc / (total || 1)) * 100;
    acc += d.total;
    return `${CORES[d.severidade]} ${ini}% ${(acc / (total || 1)) * 100}%`;
  });
  return (
    <>
      <div className="donut" style={{ background: total ? `conic-gradient(${partes.join(",")})` : "#e8edf1" }}>
        <div>
          <strong>{total}</strong>
          <small>alertas no período</small>
        </div>
      </div>
      <div className="legend" style={{ justifyContent: "center" }}>
        {dados.map((d) => (
          <span key={d.severidade}>
            <i style={{ background: CORES[d.severidade] }} /> {ROTULOS[d.severidade]} {total ? Math.round((d.total / total) * 100) : 0}%
          </span>
        ))}
      </div>
    </>
  );
}
