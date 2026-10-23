import { useNavigate } from "react-router-dom";
import { Badge, Carregando, Erro, InfoBanner, NivelBadge, PageHead } from "../components/ui";
import { useAuth, useDados } from "../lib/contexts";
import { pct } from "../lib/format";
import type { Auditoria, ZonaResumo } from "../lib/types";
import { dataHora } from "../lib/format";

export default function ZonasPage() {
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { dados, erro, recarregar } = useDados<ZonaResumo[]>("/api/zonas");
  const { dados: auditoria } = useDados<Auditoria[]>("/api/auditoria?limite=8");
  if (erro && !dados) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!dados) return <Carregando />;

  return (
    <>
      <PageHead
        eyebrow="UC11 · RF03 · RF14 · RN01"
        titulo="Zonas & regras"
        descricao="Configure a matriz de EPIs obrigatórios, o nível de risco e os limiares de confiança de cada área operacional."
        acoes={
          usuario?.perfil === "supervisor" && (
            <button className="button button-primary" onClick={() => nav("/zonas/nova")}>
              + Nova zona operacional
            </button>
          )
        }
      />
      <InfoBanner tipo="warning" icone="!" titulo="Validação humana obrigatória">
        Alterações de regra geram log de auditoria (RNF07) e devem refletir a matriz validada pela equipe de segurança da planta (RS03).
      </InfoBanner>
      <div className="zone-grid">
        {dados.map((z) => (
          <article className="card zone-card linha-clicavel" key={z.id} onClick={() => nav(`/zonas/${z.id}`)}>
            <div className="zone-top">
              <div>
                <h3>{z.nome}</h3>
                <p>
                  {z.setor} · {z.tipo_risco.toLowerCase()}
                </p>
              </div>
              {z.ativa ? <NivelBadge nivel={z.nivel_risco} /> : <Badge tipo="neutral">Inativa</Badge>}
            </div>
            <div className="trace-list">
              <div className="trace-item">
                <code>{z.epis_obrigatorios.length} EPIs</code>
                <div>
                  <strong>{z.epis_obrigatorios.join(", ")}</strong>
                  <small>Limiar mínimo de detecção: {z.limiar_minimo ? `${Math.round(z.limiar_minimo * 100)}%` : "—"}</small>
                </div>
              </div>
            </div>
            <div className="device-line">
              <span>
                {z.cameras} câmeras · {z.sensores} sensor · conformidade 24h {pct(z.conformidade_24h)}
              </span>
              <button className="section-link">{usuario?.perfil === "supervisor" ? "Configurar →" : "Ver regras →"}</button>
            </div>
          </article>
        ))}
      </div>
      {auditoria && auditoria.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 17 }}>
          <div className="section-row">
            <div>
              <h2>Últimas alterações auditadas</h2>
              <p>Cadastros e regras (RNF07)</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Usuário</th>
                  <th>Entidade</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {auditoria.map((l) => (
                  <tr key={l.id}>
                    <td>{dataHora(l.criado_em)}</td>
                    <td>{l.usuario}</td>
                    <td>{l.entidade}</td>
                    <td>{l.acao.replace("_", " ")}</td>
                    <td className="celula-longa">{l.detalhes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
