import { PageHead } from "../components/ui";

const SPRINTS = [
  ["Sprint 1", "Requisitos e modelagem", "Problema, personas, RF01–RF16, RNF, regras de negócio, casos de uso, atividades e classes."],
  ["Sprint 2", "Protótipo navegável", "Protótipo HTML/CSS/JS com os fluxos de operador, alerta, zona e relatório."],
  ["Sprint 3", "Evolução e Scrum", "Central de alertas, detalhe e histórico de ocorrências no Figma; arquitetura refinada; board Trello."],
  ["Sprint 4", "Produto funcional", "API FastAPI + PostgreSQL, motor de regras, WebSocket, React + TypeScript, Docker e testes automatizados."],
];

const RASTREIO = [
  ["RF01", "Autenticação JWT com perfis operador, supervisor e gestor"],
  ["RF02", "Operadores & EPIs → cadastro com matrícula/crachá, setor, turno e status"],
  ["RF03 · RF14", "Zonas & regras → matriz de EPIs, nível de risco e limiar de confiança por EPI"],
  ["RF04–RF06", "POST /api/eventos (Edge AI) → motor de regras compara detecções com a matriz"],
  ["RF07 · RF08", "Alerta preventivo; supervisor notificado em tempo real se severidade média/crítica"],
  ["RF09", "Terminal de campo com orientação ao operador e confirmação"],
  ["RF10 · RF11", "Tratamento: assumir, comentar, classificar, encerrar ou escalar, com linha do tempo"],
  ["RF12 · RF13", "Visão geral e Relatórios por setor, zona, turno e período; CSV e PDF"],
  ["RF15", "GET /api/integracao/eventos para ERP/MES (JSON ou CSV)"],
  ["RF16", "Saúde de câmeras e sensores; falha gera alerta técnico (RN07)"],
];

export default function SobrePage() {
  return (
    <>
      <PageHead
        eyebrow="Documentação integrada"
        titulo="Sobre o MetaSafe EPI"
        descricao="Solução do Challenge 2026 FIAP × SPI Integração para segurança industrial proativa na Metaindústria."
      />
      <div className="grid grid-2">
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Personas atendidas</h2>
              <p>Acessos da demonstração (senha metasafe123)</p>
            </div>
          </div>
          <div className="trace-list">
            <div className="trace-item">
              <code>João</code>
              <div>
                <strong>Operador de produção · joao@metaindustria.com.br</strong>
                <small>Recebe orientações claras, rápidas e não punitivas no terminal de campo.</small>
              </div>
            </div>
            <div className="trace-item">
              <code>Camila</code>
              <div>
                <strong>Supervisora de segurança · camila@metaindustria.com.br</strong>
                <small>Prioriza alertas, trata ocorrências e configura zonas e regras.</small>
              </div>
            </div>
            <div className="trace-item">
              <code>Roberto</code>
              <div>
                <strong>Gestor industrial · roberto@metaindustria.com.br</strong>
                <small>Analisa indicadores consolidados e decide onde investir em prevenção.</small>
              </div>
            </div>
          </div>
        </article>
        <article className="card card-pad">
          <div className="section-row">
            <div>
              <h2>Evolução em quatro sprints</h2>
              <p>Do requisito ao produto</p>
            </div>
          </div>
          <div className="trace-list">
            {SPRINTS.map(([s, t, d]) => (
              <div className="trace-item" key={s}>
                <code>{s}</code>
                <div>
                  <strong>{t}</strong>
                  <small>{d}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="card card-pad" style={{ marginTop: 17 }}>
        <div className="section-row">
          <div>
            <h2>Rastreabilidade dos requisitos</h2>
            <p>Cada requisito funcional da Sprint 1 e onde ele está no produto</p>
          </div>
        </div>
        <div className="grid grid-2">
          {RASTREIO.map(([rf, d]) => (
            <div className="trace-item" key={rf}>
              <code>{rf}</code>
              <div>
                <small>{d}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-pad" style={{ marginTop: 17 }}>
        <div className="section-row">
          <div>
            <h2>Fora do escopo respeitado</h2>
            <p>Limites definidos na Sprint 1</p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="info-banner" style={{ margin: 0 }}>
            <b>1</b>
            <div>
              <strong>Sem punição automática</strong>
              <span>A interface orienta e exige validação humana (RN06).</span>
            </div>
          </div>
          <div className="info-banner" style={{ margin: 0 }}>
            <b>2</b>
            <div>
              <strong>Sem reconhecimento facial</strong>
              <span>Identificação por crachá, zona e turno (RNF06).</span>
            </div>
          </div>
          <div className="info-banner" style={{ margin: 0 }}>
            <b>3</b>
            <div>
              <strong>Sem estoque ou compra</strong>
              <span>EPIs são requisitos de segurança por zona.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
