import { useNavigate } from "react-router-dom";
import { BarrasConformidade } from "../components/charts";
import { Badge, Carregando, Erro, Kpi, PageHead, Progresso, SeveridadeBadge, SeveridadeMarca, Vazio } from "../components/ui";
import { useAuth, useDados, useTempoReal } from "../lib/contexts";
import { diaSemana, dia, pct, relativo, saudacao } from "../lib/format";
import type { Alerta } from "../lib/types";
import { useDebounce } from "../lib/hooks";

interface Dashboard {
  meta_conformidade: number;
  kpis: {
    conformidade_24h: number | null;
    conformidade_7d: number | null;
    variacao_semana: number | null;
    alertas_pendentes: number;
    alertas_criticos: number;
    zonas_ativas: number;
    zonas_total: number;
    dispositivos_online: number;
    dispositivos_total: number;
    dispositivos_com_falha: string[];
    eventos_24h: number;
  };
  atencao_imediata: Alerta[];
  conformidade_por_setor: { setor: string; conformidade: number | null; eventos: number }[];
  serie_14d: { dia: string; conformidade: number | null; eventos: number; alertas: number }[];
}

export default function VisaoGeralPage() {
  const { usuario } = useAuth();
  const nav = useNavigate();
  const { dados, erro, recarregar } = useDados<Dashboard>("/api/dashboard");
  const recarregarDepois = useDebounce(recarregar, 800);
  useTempoReal((m) => m.tipo !== "conectado" && recarregarDepois());

  if (erro && !dados) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!dados) return <Carregando />;
  const k = dados.kpis;
  const saude = k.dispositivos_total ? Math.round((k.dispositivos_online / k.dispositivos_total) * 100) : 100;
  const primeiroNome = usuario?.nome.split(" ")[0];
  const pendentes = dados.atencao_imediata.length;

  return (
    <>
      <PageHead
        eyebrow="Segurança proativa em tempo real"
        titulo={`${saudacao()}, ${primeiroNome}.`}
        descricao={
          k.alertas_pendentes
            ? `${k.alertas_pendentes === 1 ? "Uma situação precisa" : `${k.alertas_pendentes} situações precisam`} de acompanhamento antes que se ${k.alertas_pendentes === 1 ? "torne incidente" : "tornem incidentes"}.`
            : "Nenhuma situação pendente no momento. A operação está estável."
        }
        acoes={
          <button className="button button-primary" onClick={() => nav("/monitoramento")}>
            Abrir monitoramento ao vivo
          </button>
        }
      />

      <div className="grid grid-4">
        <Kpi
          rotulo="Conformidade geral"
          valor={pct(k.conformidade_24h)}
          sufixo="nas últimas 24h"
          cor={k.conformidade_24h !== null && k.conformidade_24h < dados.meta_conformidade ? "warning" : "success"}
          tendencia={
            k.variacao_semana === null
              ? `Meta ≥ ${dados.meta_conformidade}%`
              : `${k.variacao_semana >= 0 ? "+" : ""}${k.variacao_semana.toLocaleString("pt-BR")} p.p. vs. semana anterior`
          }
          alerta={k.variacao_semana !== null && k.variacao_semana < 0}
        />
        <Kpi
          rotulo="Alertas ativos"
          valor={String(k.alertas_pendentes).padStart(2, "0")}
          sufixo="exigem atenção"
          cor={k.alertas_pendentes ? "danger" : "success"}
          tendencia={k.alertas_criticos ? `${k.alertas_criticos} crítico${k.alertas_criticos > 1 ? "s" : ""} agora` : "Nenhum crítico"}
          alerta={k.alertas_criticos > 0}
        />
        <Kpi rotulo="Zonas monitoradas" valor={`${k.zonas_ativas}/${k.zonas_total}`} sufixo="zonas ativas" cor="info" tendencia={`${k.eventos_24h} eventos nas últimas 24h`} />
        <Kpi
          rotulo="Saúde dos dispositivos"
          valor={`${saude}%`}
          sufixo={`${k.dispositivos_online} de ${k.dispositivos_total} online`}
          cor={k.dispositivos_com_falha.length ? "warning" : "success"}
          tendencia={k.dispositivos_com_falha.length ? `${k.dispositivos_com_falha.join(", ")} com falha` : "Todos operando"}
          alerta={k.dispositivos_com_falha.length > 0}
        />
      </div>

      <div className="grid layout-wide" style={{ marginTop: 17 }}>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Atenção imediata</h2>
              <p>Priorizado por severidade e tempo de resposta.</p>
            </div>
            <button className="section-link" onClick={() => nav("/alertas")}>
              Ver todos os alertas →
            </button>
          </div>
          {pendentes === 0 ? (
            <Vazio>Nenhum alerta pendente. 👏</Vazio>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Ocorrência</th>
                    <th>Zona</th>
                    <th>Severidade</th>
                    <th>Tempo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dados.atencao_imediata.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <SeveridadeMarca severidade={a.severidade} tecnico={a.categoria === "tecnico"} />
                      </td>
                      <td>
                        <div className="strong-cell">
                          <strong>{a.titulo}</strong>
                          <small>
                            {a.categoria === "tecnico" ? "Alerta técnico · sem operador" : a.operador ? `${a.operador.nome} · ${a.operador.matricula}` : "Operador não identificado"}
                            {a.recorrente && " · recorrente"}
                          </small>
                        </div>
                      </td>
                      <td>{a.zona}</td>
                      <td>
                        <SeveridadeBadge severidade={a.severidade} tecnico={a.categoria === "tecnico"} />
                      </td>
                      <td>{relativo(a.criado_em)}</td>
                      <td>
                        <button className="button button-quiet" onClick={() => nav(`/alertas/${a.id}`)}>
                          {a.status === "em_tratamento" ? "Continuar" : "Tratar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Ações rápidas</h2>
              <p>Acesso aos fluxos principais.</p>
            </div>
          </div>
          <div className="quick-grid">
            <button className="quick-action" onClick={() => nav("/monitoramento")}>
              <b>AO</b>
              <strong>Monitorar operação</strong>
              <small>Zonas, eventos e dispositivos ao vivo.</small>
            </button>
            <button className="quick-action" onClick={() => nav("/operadores")}>
              <b>OP</b>
              <strong>Consultar operador</strong>
              <small>EPIs obrigatórios e detecções recentes.</small>
            </button>
            <button className="quick-action" onClick={() => nav("/zonas")}>
              <b>ZR</b>
              <strong>Configurar zona</strong>
              <small>Regras, severidade e limiares.</small>
            </button>
            <button className="quick-action" onClick={() => nav("/relatorios")}>
              <b>RL</b>
              <strong>Gerar relatório</strong>
              <small>Conformidade por setor e período.</small>
            </button>
          </div>
        </article>
      </div>

      <div className="grid grid-2" style={{ marginTop: 17 }}>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Conformidade por área</h2>
              <p>Últimas 24 horas · eventos avaliados pelo edge</p>
            </div>
            <Badge tipo="info">Meta ≥ {dados.meta_conformidade}%</Badge>
          </div>
          {dados.conformidade_por_setor.map((s) => (
            <Progresso key={s.setor} rotulo={s.setor} valor={s.conformidade} meta={dados.meta_conformidade} />
          ))}
        </article>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Evolução da conformidade</h2>
              <p>Últimos 14 dias · desde a implantação do MetaSafe</p>
            </div>
          </div>
          <BarrasConformidade
            meta={dados.meta_conformidade}
            dados={dados.serie_14d.map((d, i) => ({
              rotulo: i === dados.serie_14d.length - 1 ? "Hoje" : i % 2 ? diaSemana(d.dia) : dia(d.dia),
              valor: d.conformidade,
              detalhe: `${dia(d.dia)} · ${pct(d.conformidade)} · ${d.eventos} eventos · ${d.alertas} alertas`,
            }))}
          />
        </article>
      </div>

      <div className="card card-pad" style={{ marginTop: 17 }}>
        <div className="section-row">
          <div>
            <h2>Decisão orientada à prevenção</h2>
            <p>Regras de negócio da Sprint 1 aplicadas no produto</p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="trace-item">
            <code>RN05</code>
            <div>
              <strong>Orientação ≠ punição</strong>
              <small>O sistema diferencia esquecimento pontual de recorrência e orienta primeiro.</small>
            </div>
          </div>
          <div className="trace-item">
            <code>RN07</code>
            <div>
              <strong>Falha técnica separada</strong>
              <small>Perda de sinal gera alerta técnico, nunca alerta comportamental do operador.</small>
            </div>
          </div>
          <div className="trace-item">
            <code>RN08</code>
            <div>
              <strong>Indicadores consolidados</strong>
              <small>Relatórios e exportações não expõem nomes de operadores.</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
