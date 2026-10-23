import { useNavigate } from "react-router-dom";
import { dataHora, hora, relativo } from "../lib/format";
import type { Alerta } from "../lib/types";
import { SeveridadeBadge, SeveridadeMarca, StatusBadge } from "./ui";

export default function AlertasTabela({ alertas, destaque, historico }: { alertas: Alerta[]; destaque?: Set<number>; historico?: boolean }) {
  const nav = useNavigate();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Alerta</th>
            <th>Zona / operador</th>
            <th>Severidade</th>
            <th>Status</th>
            <th>{historico ? "Classificação" : "Responsável"}</th>
            <th>{historico ? "Data" : "Horário"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => {
            const tecnico = a.categoria === "tecnico";
            return (
              <tr key={a.id} className={`linha-clicavel ${destaque?.has(a.id) ? "linha-nova" : ""}`} onClick={() => nav(`/alertas/${a.id}`)}>
                <td>
                  <SeveridadeMarca severidade={a.severidade} tecnico={tecnico} />
                </td>
                <td>
                  <div className="strong-cell">
                    <strong>{a.titulo}</strong>
                    <small>
                      {a.codigo}
                      {a.evento ? ` · evento ${a.evento}` : tecnico ? " · alerta técnico" : ""}
                      {a.recorrente && " · recorrente"}
                      {a.reincidencias > 0 && ` · ${a.reincidencias} reincidência${a.reincidencias > 1 ? "s" : ""}`}
                    </small>
                  </div>
                </td>
                <td>
                  {a.zona}
                  <small className="sub">{tecnico ? a.dispositivo : a.operador ? `${a.operador.nome} · ${a.operador.matricula}` : "Operador não identificado"}</small>
                </td>
                <td>
                  <SeveridadeBadge severidade={a.severidade} tecnico={tecnico} />
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>{historico ? a.classificacao || "—" : a.responsavel ?? "—"}</td>
                <td>
                  {historico ? dataHora(a.criado_em) : hora(a.criado_em, false)}
                  {!historico && <small className="sub">{relativo(a.criado_em)}</small>}
                </td>
                <td>
                  <button className="button button-quiet">{a.status === "ativo" ? "Tratar" : a.status === "em_tratamento" ? "Continuar" : "Ver"}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
