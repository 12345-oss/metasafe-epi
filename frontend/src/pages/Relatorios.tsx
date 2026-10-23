import { useState } from "react";
import { BarrasConformidade, DonutSeveridade } from "../components/charts";
import { Badge, Carregando, Erro, InfoBanner, Kpi, PageHead, Progresso, Vazio } from "../components/ui";
import { baixar, qs } from "../lib/api";
import { useAuth, useDados, useToast } from "../lib/contexts";
import { dia, minutos, numero, pct } from "../lib/format";
import type { Severidade, ZonaResumo } from "../lib/types";

interface Relatorio {
  periodo: { dias: number; inicio: string; fim: string };
  meta_conformidade: number;
  kpis: {
    conformidade: number | null;
    variacao: number | null;
    eventos_analisados: number;
    eventos_inconclusivos: number;
    alertas_preventivos: number;
    alertas_tecnicos: number;
    alertas_recorrentes: number;
    ocorrencias_tratadas_pct: number | null;
    tempo_medio_resposta_min: number | null;
  };
  evolucao: { dia: string; conformidade: number | null; eventos: number }[];
  por_severidade: { severidade: Severidade; total: number }[];
  epis_mais_alertas: { codigo: string; nome: string; alertas: number; participacao: number; principal_setor: string; tendencia: string | null }[];
  por_zona: { zona_id: number; zona: string; setor: string; conformidade: number | null; eventos: number; alertas: number }[];
  por_turno: { turno: string; label: string; conformidade: number | null; eventos: number }[];
}

const TENDENCIA: Record<string, ["success" | "info" | "warning", string]> = {
  reducao: ["success", "Em redução"],
  estavel: ["info", "Estável"],
  aumento: ["warning", "Requer atenção"],
  novo: ["warning", "Novo no período"],
};

export default function RelatoriosPage() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const { dados: zonas } = useDados<ZonaResumo[]>("/api/zonas");
  const [rascunho, setRascunho] = useState({ dias: "30", setor: "", zona_id: "", turno: "" });
  const [filtros, setFiltros] = useState(rascunho);
  const { dados: r, erro, recarregar, carregando } = useDados<Relatorio>(`/api/relatorios/conformidade${qs(filtros)}`);
  const setores = [...new Set((zonas ?? []).map((z) => z.setor))].sort();
  const descricaoFiltro = [
    `Últimos ${filtros.dias} dias`,
    filtros.setor || "todos os setores",
    filtros.zona_id ? zonas?.find((z) => String(z.id) === filtros.zona_id)?.nome : null,
    filtros.turno ? `turno ${filtros.turno}` : "todos os turnos",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHead
        eyebrow="UC09 · UC10 · RF12 · RF13"
        titulo="Relatórios de conformidade"
        descricao="Analise indicadores consolidados por setor, zona, turno e período, sem exposição de dados pessoais (RN08)."
        acoes={
          <>
            <button
              className="button button-secondary"
              onClick={() => baixar(`/api/relatorios/conformidade.csv${qs(filtros)}`, "relatorio.csv").catch((e) => mostrar({ tipo: "erro", titulo: "Exportação falhou", mensagem: e.message }))}
            >
              Exportar CSV
            </button>
            <button className="button button-primary" onClick={() => window.print()}>
              Exportar PDF
            </button>
          </>
        }
      />
      <form
        className="filter-bar nao-imprimir"
        onSubmit={(e) => {
          e.preventDefault();
          setFiltros(rascunho);
        }}
      >
        <div className="field">
          <label htmlFor="setor">Setor</label>
          <select id="setor" value={rascunho.setor} onChange={(e) => setRascunho((f) => ({ ...f, setor: e.target.value, zona_id: "" }))}>
            <option value="">Todos os setores</option>
            {setores.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="zona">Zona</label>
          <select id="zona" value={rascunho.zona_id} onChange={(e) => setRascunho((f) => ({ ...f, zona_id: e.target.value }))}>
            <option value="">Todas as zonas</option>
            {zonas
              ?.filter((z) => !rascunho.setor || z.setor === rascunho.setor)
              .map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nome}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="turno">Turno</label>
          <select id="turno" value={rascunho.turno} onChange={(e) => setRascunho((f) => ({ ...f, turno: e.target.value }))}>
            <option value="">Todos os turnos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dias">Período</label>
          <select id="dias" value={rascunho.dias} onChange={(e) => setRascunho((f) => ({ ...f, dias: e.target.value }))}>
            <option value="30">Últimos 30 dias</option>
            <option value="14">Últimos 14 dias</option>
            <option value="7">Últimos 7 dias</option>
            <option value="1">Hoje (24h)</option>
          </select>
        </div>
        <button className="button button-primary" disabled={carregando}>
          Gerar relatório
        </button>
      </form>

      <div className="so-impressao">
        <h1>MetaSafe EPI · Relatório de conformidade</h1>
        <p>
          {descricaoFiltro} · gerado por {usuario?.nome} em {new Date().toLocaleString("pt-BR")}
        </p>
      </div>

      {erro && <Erro mensagem={erro} tentar={recarregar} />}
      {!r ? (
        <Carregando />
      ) : (
        <>
          <div className="grid grid-4">
            <Kpi
              rotulo="Conformidade geral"
              valor={pct(r.kpis.conformidade)}
              cor={r.kpis.conformidade !== null && r.kpis.conformidade < r.meta_conformidade ? "warning" : "success"}
              tendencia={r.kpis.variacao === null ? `Meta ≥ ${r.meta_conformidade}%` : `${r.kpis.variacao >= 0 ? "+" : ""}${r.kpis.variacao.toLocaleString("pt-BR")} p.p. vs. período anterior`}
              alerta={r.kpis.variacao !== null && r.kpis.variacao < 0}
            />
            <Kpi
              rotulo="Eventos analisados"
              valor={numero(r.kpis.eventos_analisados)}
              cor="info"
              tendencia={`${pct(r.kpis.eventos_analisados ? 100 - (r.kpis.eventos_inconclusivos / r.kpis.eventos_analisados) * 100 : null)} conclusivos`}
            />
            <Kpi
              rotulo="Alertas preventivos"
              valor={numero(r.kpis.alertas_preventivos)}
              cor="warning"
              tendencia={`${r.kpis.alertas_recorrentes} recorrentes · ${r.kpis.alertas_tecnicos} técnicos`}
            />
            <Kpi rotulo="Ocorrências tratadas" valor={pct(r.kpis.ocorrencias_tratadas_pct)} cor="success" tendencia={`Tempo médio de resposta ${minutos(r.kpis.tempo_medio_resposta_min)}`} />
          </div>

          <div className="grid layout-wide" style={{ marginTop: 17 }}>
            <article className="card card-pad">
              <div className="section-row">
                <div>
                  <h2>Evolução da conformidade</h2>
                  <p>Percentual de eventos conformes por dia</p>
                </div>
                {r.kpis.variacao !== null && <Badge tipo={r.kpis.variacao >= 0 ? "success" : "warning"}>{r.kpis.variacao >= 0 ? "Tendência positiva" : "Tendência de queda"}</Badge>}
              </div>
              <BarrasConformidade
                meta={r.meta_conformidade}
                dados={r.evolucao.map((d, i) => ({
                  rotulo: r.evolucao.length > 16 && i % 3 !== r.evolucao.length % 3 ? "" : dia(d.dia),
                  valor: d.conformidade,
                  detalhe: `${dia(d.dia)} · ${pct(d.conformidade)} · ${d.eventos} eventos`,
                }))}
              />
              <div className="legend">
                <span>
                  <i /> Eventos conformes
                </span>
                <span>
                  <i style={{ background: "var(--warning)" }} /> Abaixo da meta de {r.meta_conformidade}%
                </span>
              </div>
            </article>
            <aside className="card card-pad">
              <div className="section-row">
                <div>
                  <h2>Alertas por severidade</h2>
                  <p>Distribuição consolidada</p>
                </div>
              </div>
              <DonutSeveridade dados={r.por_severidade} />
            </aside>
          </div>

          <div className="card card-pad" style={{ marginTop: 17 }}>
            <div className="section-row">
              <div>
                <h2>EPIs com mais alertas</h2>
                <p>Base para treinamento, sinalização e ajuste de processo</p>
              </div>
            </div>
            {r.epis_mais_alertas.length === 0 ? (
              <Vazio>Nenhum alerta de EPI no período.</Vazio>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo de EPI</th>
                      <th>Alertas</th>
                      <th>Participação</th>
                      <th>Principal setor</th>
                      <th>Tendência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.epis_mais_alertas.map((e) => {
                      const t = e.tendencia ? TENDENCIA[e.tendencia] : null;
                      return (
                        <tr key={e.codigo}>
                          <td>
                            <strong>{e.nome}</strong>
                          </td>
                          <td>{e.alertas}</td>
                          <td>{pct(e.participacao)}</td>
                          <td>{e.principal_setor}</td>
                          <td>{t ? <Badge tipo={t[0]}>{t[1]}</Badge> : <span className="sub">Sem base anterior</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-2" style={{ marginTop: 17 }}>
            <article className="card card-pad">
              <div className="section-row">
                <div>
                  <h2>Conformidade por zona</h2>
                  <p>Ordenado da menor para a maior</p>
                </div>
              </div>
              {r.por_zona.map((z) => (
                <Progresso key={z.zona_id} rotulo={z.zona} valor={z.conformidade} meta={r.meta_conformidade} />
              ))}
            </article>
            <article className="card card-pad">
              <div className="section-row">
                <div>
                  <h2>Conformidade por turno</h2>
                  <p>Apoio ao planejamento de DDS e treinamentos</p>
                </div>
              </div>
              {r.por_turno.map((t) => (
                <Progresso key={t.turno} rotulo={t.label} valor={t.conformidade} meta={r.meta_conformidade} />
              ))}
              <InfoBanner icone="LG" titulo="Indicadores consolidados (RN08)">
                Relatórios e exportações não exibem nomes de operadores. A integração com ERP/MES usa apenas matrícula.
              </InfoBanner>
            </article>
          </div>
        </>
      )}
    </>
  );
}
