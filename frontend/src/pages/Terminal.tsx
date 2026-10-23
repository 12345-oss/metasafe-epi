import { useEffect, useState } from "react";
import { Carregando, Erro } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useDados, useTempoReal, useToast } from "../lib/contexts";
import { hora, relativo } from "../lib/format";
import { useRelogio } from "../lib/hooks";
import type { Alerta, Evento, ZonaResumo } from "../lib/types";

const CHAVE = "metasafe.terminal.zona";

function tituloOperador(a: Alerta): string {
  const itens = a.titulo.replace(/^Sem /, "");
  return `${itens.charAt(0).toUpperCase() + itens.slice(1)}: ${a.epis_ausentes.length > 1 ? "EPIs não detectados" : "EPI não detectado"}`;
}

function zonaSalva(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/** Terminal de campo instalado na entrada da zona (UC06 · RF09): orientação preventiva ao operador. */
export default function TerminalPage() {
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  useRelogio(20000);
  const { dados: zonas } = useDados<ZonaResumo[]>("/api/zonas");
  const [zonaId, setZonaId] = useState<string | null>(zonaSalva());
  const { dados, erro, recarregar } = useDados<{ zona: ZonaResumo; alertas: Alerta[] }>(zonaId ? `/api/terminal/${zonaId}` : null);
  const [dispensados, setDispensados] = useState<Set<number>>(new Set());
  const [ultimaEntrada, setUltimaEntrada] = useState<Evento | null>(null);

  useEffect(() => {
    if (!zonaId && zonas?.length) setZonaId(String((zonas.find((z) => z.nome === "Linha de Montagem 02") ?? zonas[0]).id));
  }, [zonas, zonaId]);
  useEffect(() => {
    if (!zonaId) return;
    try {
      localStorage.setItem(CHAVE, zonaId);
    } catch {
      /* sem persistência */
    }
  }, [zonaId]);

  useTempoReal((m) => {
    if ((m.tipo === "alerta_novo" || m.tipo === "alerta_atualizado") && String(m.alerta.zona_id) === zonaId) recarregar();
    if (m.tipo === "evento" && String(m.evento.zona_id) === zonaId && m.evento.status_conformidade === "conforme") setUltimaEntrada(m.evento);
  });

  if (erro && !dados) return <Erro mensagem={erro} tentar={recarregar} />;
  if (!zonas || !dados) return <Carregando />;

  const atual = dados.alertas.find((a) => !a.orientacao_confirmada_em && !dispensados.has(a.id));
  const operadorDoAlerta = atual?.operador;
  const souEu = usuario?.operador_id && operadorDoAlerta?.id === usuario.operador_id;

  async function confirmar(a: Alerta) {
    try {
      await api(`/api/alertas/${a.id}/confirmar-orientacao`, { method: "POST" });
      mostrar({ tipo: "sucesso", titulo: "Orientação confirmada", mensagem: "A supervisão foi informada e uma nova validação será executada." });
      recarregar();
    } catch (e) {
      mostrar({ tipo: "erro", titulo: "Não foi possível confirmar", mensagem: (e as Error).message });
    }
  }

  return (
    <div className="terminal">
      <div className="terminal-barra">
        <div>
          <span className="eyebrow">Terminal de campo · UC06 · RF09</span>
          <strong>{dados.zona.nome}</strong>
        </div>
        <label>
          Zona deste terminal
          <select value={zonaId ?? ""} onChange={(e) => (setZonaId(e.target.value), setDispensados(new Set()))}>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {atual ? (
        <div className="operator-alert-shell">
          <section className="operator-alert">
            <div className="operator-alert-head">
              <strong>Alerta preventivo · {dados.zona.nome}</strong>
              <span>{relativo(atual.criado_em)}</span>
            </div>
            <div className="operator-alert-body">
              <div className="alert-symbol">!</div>
              <span className="eyebrow">{operadorDoAlerta ? `${operadorDoAlerta.nome.split(" ")[0]}, atenção antes de continuar` : "Atenção antes de continuar"}</span>
              <h1>{tituloOperador(atual)}</h1>
              <p>{atual.orientacao}</p>
              <div className="instruction-card">
                <b>1</b>
                <div>
                  <strong>Ação recomendada</strong>
                  <small>Corrija o EPI e aguarde uma nova validação automática da câmera. Não é uma advertência: é uma orientação de segurança.</small>
                </div>
              </div>
              <div className="operator-alert-actions">
                <button className="button button-secondary" onClick={() => setDispensados((s) => new Set(s).add(atual.id))}>
                  Sair da área
                </button>
                <button className="button button-primary" onClick={() => confirmar(atual)}>
                  Entendi, vou corrigir
                </button>
              </div>
              {usuario?.perfil === "operador" && operadorDoAlerta && !souEu && (
                <small className="sub" style={{ marginTop: 12 }}>
                  Alerta associado ao crachá {operadorDoAlerta.matricula}.
                </small>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="terminal-ok">
          <div className="terminal-ok-icone">✓</div>
          <h1>Zona monitorada</h1>
          <p>
            Para entrar em <strong>{dados.zona.nome}</strong>, use:
          </p>
          <ul>
            {dados.zona.epis_obrigatorios.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {ultimaEntrada && (
            <p className="terminal-entrada">
              Última entrada validada às {hora(ultimaEntrada.criado_em)} · {ultimaEntrada.resumo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
