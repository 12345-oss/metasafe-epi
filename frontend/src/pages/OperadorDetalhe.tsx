import { useNavigate, useParams } from "react-router-dom";
import { Badge, Carregando, Erro, PageHead, SeveridadeBadge, StatusBadge, Vazio, Voltar } from "../components/ui";
import { useAuth, useDados, useTempoReal } from "../lib/contexts";
import { confianca, dataHora, pct } from "../lib/format";
import { useDebounce } from "../lib/hooks";
import type { Alerta, Evento, OperadorResumo, ZonaResumo } from "../lib/types";

interface Detalhe extends OperadorResumo {
  conformidade_30d: number | null;
  eventos_30d: number;
  alertas_pendentes: number;
  alertas_30d: number;
  zona_recente: ZonaResumo | null;
  ultimo_evento: Evento | null;
  matriz_ultimo_evento: { nome: string; norma_referencia: string; limiar: number; presente: boolean | null; confianca: number | null; resultado: string }[];
  eventos: Evento[];
  alertas: Alerta[];
}

const RESULTADO: Record<string, ["success" | "danger" | "warning" | "neutral", string]> = {
  conforme: ["success", "Conforme"],
  ausente: ["danger", "Ausente"],
  abaixo_limiar: ["warning", "Abaixo do limiar"],
  nao_avaliado: ["neutral", "Não avaliado"],
};

export default function OperadorDetalhePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { dados: o, erro, recarregar } = useDados<Detalhe>(`/api/operadores/${id}`);
  const recarregarDepois = useDebounce(recarregar, 800);
  useTempoReal((m) => {
    if (m.tipo === "evento" && m.evento.operador?.id === Number(id)) recarregarDepois();
    if ((m.tipo === "alerta_novo" || m.tipo === "alerta_atualizado") && m.alerta.operador?.id === Number(id)) recarregarDepois();
  });

  if (erro && !o) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!o) return <Carregando />;
  const acao = o.alertas_pendentes > 0;

  return (
    <>
      <Voltar para="/operadores" rotulo="Voltar para operadores" />
      <PageHead
        eyebrow="UC03 · UC04 · RF06"
        titulo={o.nome}
        descricao="Consulta consolidada dos requisitos da zona, detecções de EPI e eventos associados ao operador."
        acoes={
          <>
            {usuario?.perfil === "supervisor" && (
              <button className="button button-secondary" onClick={() => nav(`/operadores/${o.id}/editar`)}>
                Editar cadastro
              </button>
            )}
            <button className="button button-secondary" onClick={() => nav("/monitoramento")}>
              Ver monitoramento
            </button>
          </>
        }
      />
      <div className="detail-hero">
        <div className="person">
          <span className="person-avatar" style={{ width: 52, height: 52, fontSize: 14 }}>
            {o.iniciais}
          </span>
          <div>
            <h2>{o.nome}</h2>
            <p>
              {o.matricula} · {o.setor} · Turno {o.turno}
            </p>
          </div>
        </div>
        <Badge tipo={acao ? "danger" : o.ultimo_evento ? "success" : "neutral"}>{acao ? "Ação necessária" : o.ultimo_evento ? "Conforme" : "Sem eventos"}</Badge>
      </div>
      <div className="stat-strip">
        <div>
          <small>Status operacional</small>
          <strong>{o.status_label}</strong>
        </div>
        <div>
          <small>Zona atual/recente</small>
          <strong>{o.zona_recente?.nome ?? "—"}</strong>
        </div>
        <div>
          <small>Último evento</small>
          <strong>{dataHora(o.ultimo_evento?.criado_em)}</strong>
        </div>
        <div>
          <small>Conformidade 30 dias</small>
          <strong>{pct(o.conformidade_30d)}</strong>
        </div>
        <div>
          <small>Alertas 30 dias</small>
          <strong>{o.alertas_30d}</strong>
        </div>
      </div>

      <div className="grid layout-wide">
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>EPIs exigidos pela zona</h2>
              <p>{o.zona_recente ? `Matriz de ${o.zona_recente.nome} aplicada ao último evento (${o.ultimo_evento?.codigo})` : "Sem eventos monitorados"}</p>
            </div>
            {o.zona_recente?.limiar_minimo && <Badge tipo="info">Limiar ≥ {Math.round(o.zona_recente.limiar_minimo * 100)}%</Badge>}
          </div>
          {o.matriz_ultimo_evento.length === 0 ? (
            <Vazio>Este operador ainda não passou por uma zona monitorada.</Vazio>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>EPI obrigatório</th>
                    <th>Norma</th>
                    <th>Detectado</th>
                    <th>Confiança</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {o.matriz_ultimo_evento.map((m) => {
                    const [cor, rot] = RESULTADO[m.resultado] ?? RESULTADO.nao_avaliado;
                    return (
                      <tr key={m.nome}>
                        <td>
                          <strong>{m.nome}</strong>
                        </td>
                        <td>{m.norma_referencia}</td>
                        <td>{m.presente === null ? "—" : m.presente ? "Sim" : "Não"}</td>
                        <td>{confianca(m.confianca)}</td>
                        <td>
                          <Badge tipo={cor}>{rot}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-row" style={{ marginTop: 24 }}>
            <div>
              <h2>Alertas e ocorrências</h2>
              <p>Histórico de tratamento (RF10)</p>
            </div>
          </div>
          {o.alertas.length === 0 ? (
            <Vazio>Nenhum alerta registrado para este operador.</Vazio>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Zona</th>
                    <th>Severidade</th>
                    <th>Status</th>
                    <th>Classificação</th>
                  </tr>
                </thead>
                <tbody>
                  {o.alertas.map((a) => (
                    <tr key={a.id} className="linha-clicavel" onClick={() => nav(`/alertas/${a.id}`)}>
                      <td>
                        <div className="strong-cell">
                          <strong>{a.titulo}</strong>
                          <small>
                            {a.codigo} · {dataHora(a.criado_em)}
                            {a.recorrente && " · recorrente"}
                          </small>
                        </div>
                      </td>
                      <td>{a.zona}</td>
                      <td>
                        <SeveridadeBadge severidade={a.severidade} />
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>{a.classificacao || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
        <aside className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Histórico recente</h2>
              <p>Eventos auditáveis</p>
            </div>
          </div>
          {o.eventos.length === 0 ? (
            <Vazio>Sem eventos.</Vazio>
          ) : (
            <div className="timeline">
              {o.eventos.map((e) => (
                <div className={`timeline-item ${e.status_conformidade}`} key={e.id}>
                  <i />
                  <div>
                    <strong>
                      {e.status_conformidade === "conforme" ? "Evento conforme" : e.status_conformidade === "inconclusivo" ? "Evento inconclusivo" : "Evento de risco identificado"}
                    </strong>
                    <small>
                      {dataHora(e.criado_em)} · {e.zona} · {e.resumo}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
