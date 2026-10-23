import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Carregando, Erro, InfoBanner, Modal, PageHead, Progresso } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useDados, useRealtime, useTempoReal, useToast } from "../lib/contexts";
import { hora, relativo } from "../lib/format";
import { useDebounce } from "../lib/hooks";
import type { Alerta, Dispositivo, Evento, OperadorLista, ZonaResumo } from "../lib/types";

interface Painel {
  zonas: (ZonaResumo & { conformidade_24h: number | null; eventos_24h: number; alertas: { comportamentais: number; tecnicos: number } })[];
  eventos_recentes: Evento[];
  saude: { cameras_online: number; cameras_total: number; sensores_online: number; sensores_total: number; api: string; clientes_tempo_real: number };
  dispositivos_com_falha: Dispositivo[];
}

const CENARIOS = [
  ["ausencia_aleatoria", "Ausência de um EPI (aleatório)"],
  ["sem_capacete", "Sem capacete"],
  ["sem_oculos", "Sem óculos de proteção"],
  ["varios_epis", "Vários EPIs ausentes"],
  ["baixa_confianca", "Detecção abaixo do limiar (RN02)"],
  ["conforme", "Entrada conforme (todos os EPIs)"],
] as const;

export default function MonitoramentoPage() {
  const { usuario } = useAuth();
  const supervisor = usuario?.perfil === "supervisor";
  const { conectado } = useRealtime();
  const { dados, erro, recarregar, setDados } = useDados<Painel>("/api/monitoramento");
  const recarregarDepois = useDebounce(recarregar, 1000);
  const [simulador, setSimulador] = useState(false);
  const [falhas, setFalhas] = useState(false);
  const [novos, setNovos] = useState<Set<number>>(new Set());

  useTempoReal((m) => {
    if (m.tipo === "evento") {
      setDados((d) => (d ? { ...d, eventos_recentes: [m.evento, ...d.eventos_recentes.filter((e) => e.id !== m.evento.id)].slice(0, 20) } : d));
      setNovos((s) => new Set(s).add(m.evento.id));
      recarregarDepois();
    } else if (m.tipo !== "conectado") {
      recarregarDepois();
    }
  });

  if (erro && !dados) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!dados) return <Carregando />;
  const s = dados.saude;

  return (
    <>
      <PageHead
        eyebrow="UC03 · UC04 · RF04–RF06 · RF16"
        titulo="Monitoramento ao vivo"
        descricao="Acompanhe eventos de campo, conformidade por zona e saúde dos dispositivos conectados."
        acoes={
          supervisor && (
            <>
              <button className="button button-secondary" onClick={() => setFalhas(true)}>
                Simular falha de dispositivo
              </button>
              <button className="button button-danger" onClick={() => setSimulador(true)}>
                Simular evento de risco
              </button>
            </>
          )
        }
      />
      <InfoBanner titulo="Processamento no edge ativo">
        As câmeras são processadas localmente (gateway Edge AI) e apenas eventos estruturados chegam à API. Nesta entrega, o gateway é
        representado pelo simulador e pelo script <code>edge-simulator/simulador.py</code>.
      </InfoBanner>

      <div className="zone-grid">
        {dados.zonas.map((z) => {
          const abaixo = z.conformidade_24h !== null && z.conformidade_24h < 95;
          return (
            <article className="card zone-card" key={z.id}>
              <div className="zone-top">
                <div>
                  <h3>{z.nome}</h3>
                  <p>
                    {z.setor} · risco {z.nivel_risco_label.toLowerCase()}
                  </p>
                </div>
                <div className="zone-score" style={abaixo ? { borderTopColor: "var(--warning)" } : undefined}>
                  {z.conformidade_24h === null ? "—" : `${Math.round(z.conformidade_24h)}%`}
                </div>
              </div>
              <Progresso rotulo="Eventos conformes" valor={z.conformidade_24h} meta={95} />
              <div className="device-line">
                <span>
                  {z.cameras} câmeras · {z.sensores} sensor{z.sensores > 1 ? "es" : ""} · {z.eventos_24h} eventos/24h
                </span>
                {z.alertas.comportamentais ? (
                  <Badge tipo="danger">
                    {z.alertas.comportamentais} alerta{z.alertas.comportamentais > 1 ? "s" : ""} ativo{z.alertas.comportamentais > 1 ? "s" : ""}
                  </Badge>
                ) : z.alertas.tecnicos || z.dispositivos_com_falha ? (
                  <Badge tipo="info">Falha técnica</Badge>
                ) : z.ativa ? (
                  <Badge tipo="success">Monitorada</Badge>
                ) : (
                  <Badge tipo="neutral">Desativada</Badge>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid layout-wide" style={{ marginTop: 17 }}>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Eventos recentes</h2>
              <p>Atualização automática em tempo real</p>
            </div>
            <Badge tipo={conectado ? "success" : "warning"}>{conectado ? "WebSocket conectado" : "Reconectando…"}</Badge>
          </div>
          <div className="event-stream">
            {dados.eventos_recentes.map((e) => (
              <div key={e.id} className={`event-item ${e.status_conformidade !== "conforme" ? "warning" : ""} ${e.status_conformidade === "nao_conforme" ? "risco" : ""} ${novos.has(e.id) ? "novo" : ""}`}>
                <i />
                <div>
                  <strong>
                    {e.status_conformidade === "conforme"
                      ? "Entrada validada com todos os EPIs"
                      : e.status_conformidade === "inconclusivo"
                        ? "EPI abaixo do limiar de confiança"
                        : "Evento de risco: EPI obrigatório ausente"}
                  </strong>
                  <small>
                    {e.zona} · {e.operador ? e.operador.matricula : "sem crachá"} · {e.resumo}
                  </small>
                </div>
                <time title={relativo(e.criado_em)}>{hora(e.criado_em)}</time>
              </div>
            ))}
          </div>
        </article>
        <aside className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Saúde da solução</h2>
              <p>Componentes críticos (RNF11)</p>
            </div>
          </div>
          <Progresso rotulo="Câmeras" valor={(s.cameras_online / Math.max(1, s.cameras_total)) * 100} direita={`${s.cameras_online}/${s.cameras_total}`} />
          <Progresso rotulo="Sensores" valor={(s.sensores_online / Math.max(1, s.sensores_total)) * 100} direita={`${s.sensores_online}/${s.sensores_total}`} />
          <Progresso rotulo="API central" valor={100} direita="Online" />
          <Progresso rotulo="Tempo real" valor={conectado ? 100 : 0} direita={conectado ? "Ativo" : "Offline"} />
          {dados.dispositivos_com_falha.map((d) => (
            <div className="info-banner warning" style={{ margin: "16px 0 0" }} key={d.id}>
              <b>!</b>
              <div>
                <strong>
                  {d.identificador} · {d.status_label.toLowerCase()}
                </strong>
                <span>
                  {d.zona}. Alerta técnico aberto para manutenção; nenhum operador foi responsabilizado (RN07).
                </span>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {supervisor && <Simulador aberto={simulador} aoFechar={() => setSimulador(false)} zonas={dados.zonas} />}
      {supervisor && <SimuladorFalhas aberto={falhas} aoFechar={() => setFalhas(false)} aoMudar={recarregar} />}
    </>
  );
}

function Simulador({ aberto, aoFechar, zonas }: { aberto: boolean; aoFechar: () => void; zonas: ZonaResumo[] }) {
  const nav = useNavigate();
  const { mostrar } = useToast();
  const [zonaId, setZonaId] = useState<number>(zonas.find((z) => z.nome === "Linha de Montagem 02")?.id ?? zonas[0]?.id);
  const [cenario, setCenario] = useState<string>("ausencia_aleatoria");
  const [operadorId, setOperadorId] = useState<string>("");
  const [operadores, setOperadores] = useState<OperadorLista[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ evento: Evento; alerta: Alerta | null; alerta_novo: boolean; payload_edge: unknown } | null>(null);
  const zona = useMemo(() => zonas.find((z) => z.id === zonaId), [zonas, zonaId]);

  useEffect(() => {
    if (!aberto || !zona) return;
    api<OperadorLista[]>(`/api/operadores?setor=${encodeURIComponent(zona.setor)}`).then((ops) =>
      setOperadores(ops.filter((o) => o.status_operacional !== "inativo")),
    );
  }, [aberto, zona]);

  async function simular() {
    setEnviando(true);
    try {
      const r = await api<typeof resultado>("/api/simulador/evento", {
        method: "POST",
        json: { zona_id: zonaId, cenario, operador_id: operadorId ? Number(operadorId) : null },
      });
      setResultado(r);
    } catch (e) {
      mostrar({ tipo: "erro", titulo: "Simulação não executada", mensagem: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Simular evento do Edge AI"
      aberto={aberto}
      aoFechar={() => {
        setResultado(null);
        aoFechar();
      }}
      rodape={
        <>
          {resultado?.alerta && (
            <button className="button button-secondary" onClick={() => nav(`/alertas/${resultado.alerta!.id}`)}>
              Abrir {resultado.alerta.codigo}
            </button>
          )}
          <button className="button button-danger" onClick={simular} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar evento"}
          </button>
        </>
      }
    >
      <p className="texto-apoio">
        Gera a leitura de uma câmera da zona como se viesse do gateway edge. O evento passa pelo mesmo motor de regras da produção.
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="sim-zona">Zona</label>
          <select id="sim-zona" value={zonaId} onChange={(e) => (setZonaId(Number(e.target.value)), setOperadorId(""))}>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nome} · risco {z.nivel_risco_label.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sim-cenario">Cenário</label>
          <select id="sim-cenario" value={cenario} onChange={(e) => setCenario(e.target.value)}>
            {CENARIOS.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field form-span">
          <label htmlFor="sim-op">Crachá lido na entrada (opcional)</label>
          <select id="sim-op" value={operadorId} onChange={(e) => setOperadorId(e.target.value)}>
            <option value="">Sortear operador do setor {zona?.setor}</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome} · {o.matricula} · turno {o.turno}
              </option>
            ))}
          </select>
        </div>
      </div>
      {zona && (
        <p className="texto-apoio">
          Matriz da zona: <strong>{zona.epis_obrigatorios.join(", ")}</strong>
        </p>
      )}
      {resultado && (
        <div className="resultado-simulacao">
          {resultado.alerta ? (
            <InfoBanner tipo={resultado.alerta.severidade === "critica" ? "danger" : "warning"} icone="!" titulo={`${resultado.alerta_novo ? "Alerta emitido" : "Alerta reforçado (reincidência)"} · ${resultado.alerta.codigo}`}>
              {resultado.alerta.titulo} · severidade {resultado.alerta.severidade_label.toLowerCase()} ·{" "}
              {resultado.alerta.notificou_supervisor ? "supervisor notificado." : "apenas orientação ao operador."}
            </InfoBanner>
          ) : (
            <InfoBanner titulo={`Evento ${resultado.evento.codigo} registrado · ${resultado.evento.status_conformidade === "conforme" ? "conforme" : "inconclusivo, sem alerta (RN02)"}`}>
              {resultado.evento.resumo}
            </InfoBanner>
          )}
          <details>
            <summary>Payload enviado pelo edge</summary>
            <pre>{JSON.stringify(resultado.payload_edge, null, 2)}</pre>
          </details>
        </div>
      )}
    </Modal>
  );
}

function SimuladorFalhas({ aberto, aoFechar, aoMudar }: { aberto: boolean; aoFechar: () => void; aoMudar: () => void }) {
  const { mostrar } = useToast();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [id, setId] = useState<string>("");
  const carregar = () => api<Dispositivo[]>("/api/dispositivos").then(setDispositivos);
  useEffect(() => {
    if (aberto) carregar();
  }, [aberto]);

  async function mudar(status: "online" | "degradado" | "offline", alvo?: number) {
    const dispId = alvo ?? Number(id);
    if (!dispId) return;
    try {
      const r = await api<{ dispositivo: Dispositivo; alerta: Alerta | null }>(`/api/simulador/dispositivos/${dispId}`, { method: "POST", json: { status } });
      mostrar({
        tipo: status === "online" ? "sucesso" : "info",
        titulo: `${r.dispositivo.identificador}: ${r.dispositivo.status_label}`,
        mensagem: r.alerta ? `Alerta técnico ${r.alerta.codigo} ${status === "online" ? "atualizado" : "registrado"}.` : "Status atualizado.",
      });
      carregar();
      aoMudar();
    } catch (e) {
      mostrar({ tipo: "erro", titulo: "Não foi possível alterar", mensagem: (e as Error).message });
    }
  }

  const comFalha = dispositivos.filter((d) => d.status !== "online");
  return (
    <Modal titulo="Simular falha de dispositivo (RF16 · RN07)" aberto={aberto} aoFechar={aoFechar}>
      <p className="texto-apoio">Uma falha gera um alerta técnico para a manutenção, sem associar nenhum operador.</p>
      <div className="form-grid">
        <div className="field form-span">
          <label htmlFor="disp">Dispositivo</label>
          <select id="disp" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Selecione…</option>
            {dispositivos
              .filter((d) => d.status === "online")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.identificador} · {d.zona}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start" }}>
        <button className="button button-secondary" disabled={!id} onClick={() => mudar("degradado")}>
          Modo degradado
        </button>
        <button className="button button-danger" disabled={!id} onClick={() => mudar("offline")}>
          Perda de sinal
        </button>
      </div>
      {comFalha.length > 0 && (
        <>
          <h3 style={{ margin: "20px 0 8px", fontSize: 14 }}>Dispositivos com falha</h3>
          {comFalha.map((d) => (
            <div className="linha-dispositivo" key={d.id}>
              <span>
                <strong>{d.identificador}</strong> · {d.zona} · {d.status_label}
              </span>
              <button className="button button-quiet" onClick={() => mudar("online", d.id)}>
                Restabelecer sinal
              </button>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}

