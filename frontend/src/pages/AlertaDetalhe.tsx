import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Evidencia from "../components/Evidencia";
import { Badge, Carregando, Erro, InfoBanner, Modal, PageHead, SeveridadeBadge, StatusBadge, Voltar } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useDados, useTempoReal, useToast } from "../lib/contexts";
import { confianca, dataHora, hora, minutos, relativo } from "../lib/format";
import { useRelogio } from "../lib/hooks";
import type { AlertaDetalhe, Referencias } from "../lib/types";

const RESULTADO: Record<string, ["success" | "danger" | "warning" | "neutral", string]> = {
  conforme: ["success", "Detectado"],
  ausente: ["danger", "Ausente"],
  abaixo_limiar: ["warning", "Abaixo do limiar"],
  nao_avaliado: ["neutral", "Não avaliado"],
};

const ROTULO_ACAO: Record<string, string> = {
  evento: "Evento capturado no edge",
  emitido: "Alerta emitido",
  notificacao: "Notificação",
  orientacao_confirmada: "Operador confirmou orientação",
  assumido: "Tratamento iniciado",
  comentario: "Comentário",
  reincidencia: "Nova detecção (reincidência)",
  status_dispositivo: "Status do dispositivo",
  encerrado: "Ocorrência encerrada",
  escalado: "Ocorrência escalada",
};

export default function AlertaDetalhePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  useRelogio(15000);
  const { dados: a, erro, recarregar, setDados } = useDados<AlertaDetalhe>(`/api/alertas/${id}`);
  const { dados: refs } = useDados<Referencias>("/api/referencias");
  const [form, setForm] = useState({ classificacao: "", situacao_verificada: "", comentario: "" });
  const [comentario, setComentario] = useState("");
  const [escalar, setEscalar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useTempoReal((m) => {
    if (m.tipo === "alerta_atualizado" && m.alerta.id === Number(id)) recarregar();
  });

  if (erro && !a) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!a || !refs) return <Carregando />;

  const tecnico = a.categoria === "tecnico";
  const pendente = a.status === "ativo" || a.status === "em_tratamento";
  const podeTratar = usuario?.perfil === "supervisor" || usuario?.perfil === "gestor";
  const classificacao = form.classificacao || (tecnico ? "Falha técnica" : a.recorrente ? "Risco recorrente" : "Esquecimento pontual");
  const situacao = form.situacao_verificada || (tecnico ? "Dispositivo restabelecido" : "EPI corrigido pelo operador");

  async function acao(caminho: string, corpo?: unknown, sucesso?: string) {
    setEnviando(true);
    try {
      const r = await api<AlertaDetalhe>(`/api/alertas/${id}/${caminho}`, { method: "POST", json: corpo ?? {} });
      setDados(r);
      if (sucesso) mostrar({ tipo: "sucesso", titulo: sucesso, mensagem: "Histórico auditável atualizado." });
      return true;
    } catch (e) {
      mostrar({ tipo: "erro", titulo: "Ação não concluída", mensagem: (e as Error).message });
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function encerrar(e: FormEvent) {
    e.preventDefault();
    const ok = await acao("encerrar", { classificacao, situacao_verificada: situacao, comentario: form.comentario }, "Ocorrência encerrada");
    if (ok) nav("/alertas");
  }

  const tempoAberto = a.finalizado_em ? minutos(a.tempo_total_min) : relativo(a.criado_em).replace("há ", "");

  return (
    <>
      <Voltar para="/alertas" rotulo="Voltar para alertas" />
      <PageHead
        eyebrow="UC08 · RF10 · RF11 · RN04"
        titulo={pendente ? `Tratar ocorrência ${a.codigo}` : `Ocorrência ${a.codigo}`}
        descricao={pendente ? "Valide a situação, registre a ação preventiva e escolha entre encerrar ou escalar." : "Registro auditável do tratamento."}
        acoes={
          pendente &&
          podeTratar &&
          a.status === "ativo" && (
            <button className="button button-primary" disabled={enviando} onClick={() => acao("assumir", undefined, "Tratamento iniciado")}>
              Assumir tratamento
            </button>
          )
        }
      />
      <InfoBanner tipo={tecnico ? undefined : a.severidade === "critica" ? "danger" : "warning"} icone={tecnico ? "i" : "!"} titulo={`${a.titulo} · ${tecnico ? "alerta técnico" : `severidade ${a.severidade_label.toLowerCase()}`}`}>
        {a.zona} · {tecnico ? a.dispositivo : a.operador ? `${a.operador.nome} (${a.operador.matricula})` : "operador não identificado"} · detectado em{" "}
        {dataHora(a.criado_em)} ({hora(a.criado_em)}).
        {a.recorrente && " Risco recorrente: o operador teve 2 ou mais alertas nos 7 dias anteriores (RN05)."}
      </InfoBanner>

      <div className="grid layout-wide">
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Dados da ocorrência</h2>
              <p>{tecnico ? "Falha reportada pelo gateway edge" : "Evidência minimizada e dados do evento"}</p>
            </div>
            <StatusBadge status={a.status} />
          </div>
          <div className="stat-strip">
            <div>
              <small>{tecnico ? "Dispositivo" : "Evento"}</small>
              <strong>{tecnico ? a.dispositivo : a.evento}</strong>
            </div>
            <div>
              <small>Zona</small>
              <strong>{a.zona}</strong>
            </div>
            <div>
              <small>{tecnico ? "Tipo" : "Confiança"}</small>
              <strong>{tecnico ? "Técnico" : confianca(a.confianca)}</strong>
            </div>
            <div>
              <small>{a.finalizado_em ? "Tempo total" : "Tempo aberto"}</small>
              <strong>{tempoAberto}</strong>
            </div>
            <div>
              <small>Responsável</small>
              <strong>{a.responsavel ?? "—"}</strong>
            </div>
          </div>

          {!tecnico && (
            <>
              <div className="evidencia-grid">
                <Evidencia itens={a.deteccoes} camera={a.dispositivo} />
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>EPI da matriz</th>
                        <th>Confiança</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.deteccoes.map((d) => {
                        const [cor, rot] = RESULTADO[d.resultado];
                        return (
                          <tr key={d.epi}>
                            <td>
                              <strong>{d.nome}</strong>
                            </td>
                            <td>
                              {confianca(d.confianca)}
                              <small className="sub">mín. {Math.round(d.limiar * 100)}%</small>
                            </td>
                            <td>
                              <Badge tipo={cor}>{rot}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="instruction-card" style={{ marginTop: 16 }}>
                <b>1</b>
                <div>
                  <strong>Orientação exibida ao operador (RF09)</strong>
                  <small>{a.orientacao}</small>
                  <small className="sub">
                    {a.orientacao_confirmada_em ? `Confirmada pelo operador às ${hora(a.orientacao_confirmada_em)}.` : "Aguardando confirmação no terminal de campo."}
                  </small>
                </div>
              </div>
            </>
          )}
          {tecnico && (
            <InfoBanner titulo="Alerta técnico separado (RN07)">
              {a.mensagem} Encaminhe à manutenção e encerre como “Falha técnica” quando o dispositivo voltar a operar.
            </InfoBanner>
          )}

          {pendente && podeTratar ? (
            <form onSubmit={encerrar} style={{ marginTop: 22 }}>
              <div className="section-row">
                <div>
                  <h2>Tratamento</h2>
                  <p>RN06: o registro orienta e documenta — nenhuma advertência é gerada automaticamente.</p>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="classificacao">Classificação</label>
                  <select id="classificacao" value={classificacao} onChange={(e) => setForm((f) => ({ ...f, classificacao: e.target.value }))}>
                    {refs.classificacoes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="situacao">Situação verificada</label>
                  <select id="situacao" value={situacao} onChange={(e) => setForm((f) => ({ ...f, situacao_verificada: e.target.value }))}>
                    {refs.situacoes_verificadas.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field form-span">
                  <label htmlFor="comentario">Ação preventiva / comentário</label>
                  <textarea
                    id="comentario"
                    required
                    minLength={5}
                    value={form.comentario}
                    onChange={(e) => setForm((f) => ({ ...f, comentario: e.target.value }))}
                    placeholder={tecnico ? "Ex.: cabo PoE substituído pela manutenção; imagem normalizada." : "Ex.: operador orientado no posto; EPI corrigido e nova validação automática conforme."}
                  />
                </div>
              </div>
              {situacao === "Risco ainda presente" && (
                <p className="erro-form">Com o risco ainda presente, a ocorrência deve ser escalada para a equipe de segurança.</p>
              )}
              <div className="form-actions">
                <button type="button" className="button button-danger" onClick={() => setEscalar(true)} disabled={enviando}>
                  Escalar ocorrência
                </button>
                <button className="button button-primary" disabled={enviando || situacao === "Risco ainda presente"}>
                  Encerrar com ação preventiva
                </button>
              </div>
            </form>
          ) : (
            !pendente && (
              <div className="resumo-final">
                <div className="section-row" style={{ marginTop: 22 }}>
                  <div>
                    <h2>Resultado do tratamento</h2>
                    <p>
                      {a.status === "escalado" ? "Escalada" : "Encerrada"} por {a.responsavel} em {dataHora(a.finalizado_em)}
                    </p>
                  </div>
                </div>
                <div className="stat-strip">
                  <div>
                    <small>Classificação</small>
                    <strong>{a.classificacao}</strong>
                  </div>
                  <div>
                    <small>Situação verificada</small>
                    <strong>{a.situacao_verificada || "—"}</strong>
                  </div>
                  <div>
                    <small>Tempo de resposta</small>
                    <strong>{minutos(a.tempo_resposta_min)}</strong>
                  </div>
                </div>
                <p className="texto-apoio">{a.comentario_final}</p>
              </div>
            )
          )}
        </article>

        <aside className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Linha do tempo</h2>
              <p>Histórico auditável (RNF07)</p>
            </div>
          </div>
          <div className="timeline">
            {a.historico.map((h) => (
              <div className={`timeline-item acao-${h.acao}`} key={h.id}>
                <i />
                <div>
                  <strong>{ROTULO_ACAO[h.acao] ?? h.acao}</strong>
                  <small>
                    {hora(h.criado_em)} · {h.autor} · {h.descricao}
                  </small>
                </div>
              </div>
            ))}
          </div>
          {podeTratar && (
            <form
              className="comentario-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await acao("comentarios", { texto: comentario })) setComentario("");
              }}
            >
              <div className="field">
                <label htmlFor="novo-comentario">Adicionar comentário</label>
                <textarea id="novo-comentario" rows={2} required minLength={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
              </div>
              <button className="button button-secondary" disabled={enviando || comentario.trim().length < 2}>
                Comentar
              </button>
            </form>
          )}
        </aside>
      </div>

      <Modal
        titulo={`Escalar ${a.codigo}`}
        aberto={escalar}
        aoFechar={() => setEscalar(false)}
        rodape={
          <>
            <button className="button button-secondary" onClick={() => setEscalar(false)}>
              Cancelar
            </button>
            <button
              className="button button-danger"
              disabled={enviando || form.comentario.trim().length < 5}
              onClick={async () => {
                if (await acao("escalar", { classificacao, comentario: form.comentario }, "Ocorrência escalada")) {
                  setEscalar(false);
                  nav("/alertas");
                }
              }}
            >
              Confirmar escalonamento
            </button>
          </>
        }
      >
        <p className="texto-apoio">
          A ocorrência será encaminhada à equipe de segurança (SESMT) com severidade crítica. Use quando o risco não foi corrigido.
        </p>
        <div className="field">
          <label htmlFor="motivo">Motivo do escalonamento</label>
          <textarea id="motivo" required minLength={5} value={form.comentario} onChange={(e) => setForm((f) => ({ ...f, comentario: e.target.value }))} />
        </div>
        <p className="texto-apoio">
          Classificação: <SeveridadeBadge severidade="critica" /> {classificacao}
        </p>
      </Modal>
    </>
  );
}
