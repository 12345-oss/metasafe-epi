import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Carregando, Erro, InfoBanner, PageHead, Vazio } from "../components/ui";
import { qs } from "../lib/api";
import { useAuth, useDados } from "../lib/contexts";
import { pct, relativo } from "../lib/format";
import type { OperadorLista } from "../lib/types";

const SITUACAO: Record<OperadorLista["situacao"], [("danger" | "success" | "neutral"), string]> = {
  acao_necessaria: ["danger", "Ação necessária"],
  conforme: ["success", "Conforme"],
  sem_evento: ["neutral", "Sem evento recente"],
};

export default function OperadoresPage() {
  const nav = useNavigate();
  const { usuario } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ q: "", setor: "", turno: "", situacao: "" });
  const { dados, erro, recarregar } = useDados<OperadorLista[]>(`/api/operadores${qs(filtros)}`);
  const { dados: setores } = useDados<string[]>("/api/operadores/setores");

  return (
    <>
      <PageHead
        eyebrow="RF02 · UC03 · UC04"
        titulo="Operadores & EPIs"
        descricao="Cadastre operadores e consulte os EPIs obrigatórios e detectados nos eventos associados a cada colaborador."
        acoes={
          usuario?.perfil === "supervisor" && (
            <button className="button button-primary" onClick={() => nav("/operadores/novo")}>
              + Cadastrar operador
            </button>
          )
        }
      />
      <InfoBanner titulo="Conformidade por zona, sem controle de estoque">
        Os EPIs são consultados pela conformidade do operador em cada zona monitorada. A identificação usa matrícula/crachá — o MetaSafe
        não usa reconhecimento facial (RNF06).
      </InfoBanner>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          setFiltros((f) => ({ ...f, q: busca }));
        }}
      >
        <div className="field">
          <label htmlFor="busca">Buscar operador</label>
          <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, matrícula ou setor" />
        </div>
        <div className="field">
          <label htmlFor="f-setor">Setor</label>
          <select id="f-setor" value={filtros.setor} onChange={(e) => setFiltros((f) => ({ ...f, setor: e.target.value }))}>
            <option value="">Todos os setores</option>
            {setores?.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-turno">Turno</label>
          <select id="f-turno" value={filtros.turno} onChange={(e) => setFiltros((f) => ({ ...f, turno: e.target.value }))}>
            <option value="">Todos os turnos</option>
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sit">Situação</label>
          <select id="f-sit" value={filtros.situacao} onChange={(e) => setFiltros((f) => ({ ...f, situacao: e.target.value }))}>
            <option value="">Todas</option>
            <option value="acao_necessaria">Ação necessária</option>
            <option value="conforme">Conforme</option>
            <option value="sem_evento">Sem evento recente</option>
          </select>
        </div>
        <button className="button button-secondary">Buscar</button>
      </form>

      {erro && <Erro mensagem={erro} tentar={recarregar} />}
      {!dados ? (
        <Carregando />
      ) : dados.length === 0 ? (
        <Vazio>Nenhum operador encontrado com esses filtros.</Vazio>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Operador</th>
                <th>Setor</th>
                <th>Turno</th>
                <th>Zona recente</th>
                <th>Conformidade 30d</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dados.map((o) => {
                const [cor, rot] = SITUACAO[o.situacao];
                return (
                  <tr key={o.id} className="linha-clicavel" onClick={() => nav(`/operadores/${o.id}`)}>
                    <td>
                      <div className="person">
                        <span className="person-avatar">{o.iniciais}</span>
                        <div className="strong-cell">
                          <strong>{o.nome}</strong>
                          <small>
                            {o.matricula}
                            {o.status_operacional !== "em_operacao" && ` · ${o.status_label}`}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{o.setor}</td>
                    <td>Turno {o.turno}</td>
                    <td>
                      {o.zona_recente ?? "—"}
                      {o.ultimo_evento && <small className="sub">{relativo(o.ultimo_evento)}</small>}
                    </td>
                    <td>{pct(o.conformidade_30d)}</td>
                    <td>
                      <Badge tipo={cor}>{o.alertas_pendentes > 1 ? `${rot} (${o.alertas_pendentes})` : rot}</Badge>
                    </td>
                    <td>
                      <button className="button button-quiet">Consultar EPIs</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
