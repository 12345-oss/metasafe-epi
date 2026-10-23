import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Carregando, InfoBanner, PageHead, Voltar } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useDados, useToast } from "../lib/contexts";
import { dataHora, pct, relativo } from "../lib/format";
import type { Referencias, TipoEPI, ZonaDetalhe } from "../lib/types";

interface LinhaMatriz {
  tipo_epi_id: number;
  confianca_minima: number;
  obrigatorio: boolean;
}

export default function ZonaFormPage() {
  const { id } = useParams();
  const edicao = Boolean(id);
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const leitura = usuario?.perfil !== "supervisor";
  const { dados: tipos } = useDados<TipoEPI[]>("/api/tipos-epi");
  const { dados: refs } = useDados<Referencias>("/api/referencias");
  const [zona, setZona] = useState<ZonaDetalhe | null>(null);
  const [form, setForm] = useState({ nome: "", setor: "", linha: "", tipo_risco: "Mecânico", nivel_risco: "alto", ativa: true });
  const [matriz, setMatriz] = useState<LinhaMatriz[]>([]);
  const [novoEpi, setNovoEpi] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!edicao) return;
    api<ZonaDetalhe>(`/api/zonas/${id}`).then((z) => {
      setZona(z);
      setForm({ nome: z.nome, setor: z.setor, linha: z.linha, tipo_risco: z.tipo_risco, nivel_risco: z.nivel_risco, ativa: z.ativa });
      setMatriz(z.requisitos.map((r) => ({ tipo_epi_id: r.tipo_epi_id, confianca_minima: r.confianca_minima, obrigatorio: r.obrigatorio })));
    });
  }, [edicao, id]);

  if (!tipos || !refs || (edicao && !zona)) return <Carregando />;
  const tipoPorId = Object.fromEntries(tipos.map((t) => [t.id, t]));
  const disponiveis = tipos.filter((t) => !matriz.some((m) => m.tipo_epi_id === t.id));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const z = await api<ZonaDetalhe>(edicao ? `/api/zonas/${id}` : "/api/zonas", { method: edicao ? "PUT" : "POST", json: { ...form, requisitos: matriz } });
      mostrar({ tipo: "sucesso", titulo: "Configuração salva", mensagem: "A matriz de EPIs foi atualizada e registrada na auditoria." });
      nav(edicao ? "/zonas" : `/zonas/${z.id}`);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const campo = (k: "nome" | "setor" | "linha" | "tipo_risco" | "nivel_risco") => ({
    value: form[k],
    disabled: leitura,
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });
  const mudarLinha = (i: number, parcial: Partial<LinhaMatriz>) => setMatriz((m) => m.map((l, j) => (i === j ? { ...l, ...parcial } : l)));

  return (
    <>
      <Voltar para="/zonas" rotulo="Voltar para zonas" />
      <PageHead
        eyebrow="UC11 · ZonaOperacional · RequisitoEPI"
        titulo={edicao ? zona!.nome : "Nova zona operacional"}
        descricao={leitura ? "Visualização das regras da zona. Somente o supervisor de segurança altera regras." : "Ajuste requisitos de EPI e limiares. Toda alteração será registrada no histórico de auditoria."}
      />
      <form className="card form-card" style={{ maxWidth: "100%" }} onSubmit={salvar}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="nome">Nome da zona</label>
            <input id="nome" required minLength={3} {...campo("nome")} />
          </div>
          <div className="field">
            <label htmlFor="setor">Setor</label>
            <input id="setor" required list="setores" {...campo("setor")} />
            <datalist id="setores">
              {["Produção", "Logística", "Manutenção", "Qualidade"].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="linha">Linha / área</label>
            <input id="linha" {...campo("linha")} />
          </div>
          <div className="field">
            <label htmlFor="risco">Tipo de risco predominante</label>
            <select id="risco" {...campo("tipo_risco")}>
              {refs.tipos_risco.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nivel">Nível de risco (define a severidade base)</label>
            <select id="nivel" {...campo("nivel_risco")}>
              <option value="medio">Médio → severidade base baixa</option>
              <option value="alto">Alto → severidade base média</option>
              <option value="critico">Crítico → média; crítica se faltar EPI crítico</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ativa">Monitoramento</label>
            <select id="ativa" disabled={leitura} value={form.ativa ? "1" : "0"} onChange={(e) => setForm((f) => ({ ...f, ativa: e.target.value === "1" }))}>
              <option value="1">Ativo</option>
              <option value="0">Desativado</option>
            </select>
          </div>
        </div>

        <div className="section-row" style={{ marginTop: 25 }}>
          <div>
            <h2>Matriz de EPIs obrigatórios</h2>
            <p>RN01 · RF14 · detecções abaixo do limiar não geram alerta (RN02)</p>
          </div>
          {!leitura && (
            <div className="linha-acoes">
              <select value={novoEpi} onChange={(e) => setNovoEpi(e.target.value)} aria-label="EPI a adicionar">
                <option value="">Adicionar EPI…</option>
                {disponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button button-secondary"
                disabled={!novoEpi}
                onClick={() => {
                  setMatriz((m) => [...m, { tipo_epi_id: Number(novoEpi), confianca_minima: 0.85, obrigatorio: true }]);
                  setNovoEpi("");
                }}
              >
                + Adicionar
              </button>
            </div>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EPI</th>
                <th>Norma de referência</th>
                <th>Classe detectada</th>
                <th>Confiança mínima</th>
                <th>Obrigatório</th>
                {!leitura && <th></th>}
              </tr>
            </thead>
            <tbody>
              {matriz.map((l, i) => {
                const t = tipoPorId[l.tipo_epi_id];
                return (
                  <tr key={l.tipo_epi_id}>
                    <td>
                      <strong>{t?.nome}</strong>
                    </td>
                    <td>{t?.norma_referencia}</td>
                    <td>
                      <code>{t?.codigo_deteccao}</code>
                    </td>
                    <td>
                      <div className="limiar">
                        <input
                          type="range"
                          min={50}
                          max={99}
                          disabled={leitura}
                          value={Math.round(l.confianca_minima * 100)}
                          onChange={(e) => mudarLinha(i, { confianca_minima: Number(e.target.value) / 100 })}
                          aria-label={`Confiança mínima de ${t?.nome}`}
                        />
                        <strong>{Math.round(l.confianca_minima * 100)}%</strong>
                      </div>
                    </td>
                    <td>
                      <label className="toggle">
                        <input type="checkbox" disabled={leitura} checked={l.obrigatorio} onChange={(e) => mudarLinha(i, { obrigatorio: e.target.checked })} />
                        {l.obrigatorio ? <Badge tipo="success">Sim</Badge> : <Badge tipo="neutral">Opcional</Badge>}
                      </label>
                    </td>
                    {!leitura && (
                      <td>
                        <button type="button" className="button button-quiet" onClick={() => setMatriz((m) => m.filter((_, j) => j !== i))}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {matriz.length === 0 && <p className="erro-form">Adicione pelo menos um EPI obrigatório.</p>}
        {erro && (
          <p className="erro-form" role="alert">
            {erro}
          </p>
        )}
        {!leitura && (
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => nav("/zonas")}>
              Cancelar
            </button>
            <button className="button button-primary" disabled={enviando || matriz.length === 0}>
              {enviando ? "Salvando…" : "Salvar e registrar auditoria"}
            </button>
          </div>
        )}
      </form>

      {zona && (
        <div className="grid grid-2" style={{ marginTop: 17 }}>
          <article className="card card-pad">
            <div className="section-row">
              <div>
                <h2>Dispositivos da zona</h2>
                <p>
                  Conformidade 24h: {pct(zona.conformidade_24h)} · {zona.eventos_24h} eventos
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dispositivo</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Último sinal</th>
                  </tr>
                </thead>
                <tbody>
                  {zona.dispositivos.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.identificador}</strong>
                        <small className="sub">{d.descricao}</small>
                      </td>
                      <td>{d.tipo === "camera" ? "Câmera IP" : "Sensor IoT"}</td>
                      <td>
                        <Badge tipo={d.status === "online" ? "success" : d.status === "degradado" ? "warning" : "danger"}>{d.status_label}</Badge>
                      </td>
                      <td>{relativo(d.ultimo_sinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="card card-pad">
            <div className="section-row">
              <div>
                <h2>Histórico de auditoria</h2>
                <p>Alterações de regra desta zona (RNF07)</p>
              </div>
            </div>
            {zona.auditoria.length === 0 ? (
              <InfoBanner titulo="Sem alterações registradas." />
            ) : (
              <div className="timeline">
                {zona.auditoria.map((l) => (
                  <div className="timeline-item" key={l.id}>
                    <i />
                    <div>
                      <strong>
                        {l.acao === "criacao" ? "Zona cadastrada" : "Regra alterada"} · {l.usuario}
                      </strong>
                      <small className="pre">
                        {dataHora(l.criado_em)} · {l.detalhes}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      )}
    </>
  );
}
