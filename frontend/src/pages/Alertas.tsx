import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertasTabela from "../components/AlertasTabela";
import { Carregando, Erro, PageHead, Paginacao, Vazio } from "../components/ui";
import { baixar, qs } from "../lib/api";
import { useDados, useTempoReal, useToast } from "../lib/contexts";
import { minutos } from "../lib/format";
import { useDebounce, useRelogio } from "../lib/hooks";
import type { Alerta, Pagina, ZonaResumo } from "../lib/types";

interface Resumo {
  ativos: number;
  em_tratamento: number;
  criticos: number;
  tecnicos: number;
  tempo_medio_resposta_min: number | null;
  encerrados_ultimas_8h: number;
}

export default function AlertasPage() {
  const nav = useNavigate();
  const { mostrar } = useToast();
  useRelogio();
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ status: "ativo,em_tratamento", severidade: "", categoria: "", zona_id: "", q: "" });
  const [pagina, setPagina] = useState(1);
  const [novos, setNovos] = useState<Set<number>>(new Set());
  const caminho = `/api/alertas${qs({ ...filtros, ordenar: "prioridade", pagina, por_pagina: 25 })}`;
  const lista = useDados<Pagina<Alerta>>(caminho);
  const resumo = useDados<Resumo>("/api/alertas/resumo");
  const { dados: zonas } = useDados<ZonaResumo[]>("/api/zonas");
  const atualizar = useDebounce(() => {
    lista.recarregar();
    resumo.recarregar();
  }, 500);

  useTempoReal((m) => {
    if (m.tipo === "alerta_novo" || m.tipo === "alerta_atualizado") {
      if (m.tipo === "alerta_novo") setNovos((s) => new Set(s).add(m.alerta.id));
      atualizar();
    }
  });

  const mudar = (campo: keyof typeof filtros, valor: string) => {
    setPagina(1);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  };
  const r = resumo.dados;

  return (
    <>
      <PageHead
        eyebrow="UC05 · UC07 · UC08 · Sprint 3"
        titulo="Central de alertas"
        descricao="Alertas emitidos automaticamente, priorizados por severidade. O tratamento exige validação humana — nenhuma punição é automática (RN06)."
        acoes={
          <>
            <button
              className="button button-secondary"
              onClick={() => baixar(`/api/alertas/exportar.csv${qs(filtros)}`, "alertas.csv").catch((e) => mostrar({ tipo: "erro", titulo: "Exportação falhou", mensagem: e.message }))}
            >
              Exportar CSV
            </button>
            <button className="button button-secondary" onClick={() => nav("/monitoramento")}>
              Ver origem dos eventos
            </button>
          </>
        }
      />
      <div className="stat-strip">
        <div>
          <small>Alertas ativos</small>
          <strong>{r?.ativos ?? "—"}</strong>
        </div>
        <div>
          <small>Em tratamento</small>
          <strong>{r?.em_tratamento ?? "—"}</strong>
        </div>
        <div>
          <small>Críticos</small>
          <strong style={{ color: "var(--danger)" }}>{r?.criticos ?? "—"}</strong>
        </div>
        <div>
          <small>Tempo médio de resposta (7d)</small>
          <strong>{minutos(r?.tempo_medio_resposta_min)}</strong>
        </div>
        <div>
          <small>Finalizados nas últimas 8h</small>
          <strong>{r?.encerrados_ultimas_8h ?? "—"}</strong>
        </div>
      </div>
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          mudar("q", busca);
        }}
      >
        <div className="field">
          <label htmlFor="q">Buscar alerta</label>
          <input id="q" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Mensagem, zona ou matrícula" />
        </div>
        <div className="field">
          <label htmlFor="sev">Severidade</label>
          <select id="sev" value={filtros.severidade} onChange={(e) => mudar("severidade", e.target.value)}>
            <option value="">Todas</option>
            <option value="critica">Crítica</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="cat">Tipo</label>
          <select id="cat" value={filtros.categoria} onChange={(e) => mudar("categoria", e.target.value)}>
            <option value="">Todos</option>
            <option value="comportamental">EPI (comportamental)</option>
            <option value="tecnico">Técnico (dispositivo)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="st">Status</label>
          <select id="st" value={filtros.status} onChange={(e) => mudar("status", e.target.value)}>
            <option value="ativo,em_tratamento">Pendentes</option>
            <option value="ativo">Ativos</option>
            <option value="em_tratamento">Em tratamento</option>
            <option value="encerrado,escalado">Finalizados</option>
            <option value="">Todos</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="zona">Zona</label>
          <select id="zona" value={filtros.zona_id} onChange={(e) => mudar("zona_id", e.target.value)}>
            <option value="">Todas</option>
            {zonas?.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nome}
              </option>
            ))}
          </select>
        </div>
        <button className="button button-secondary">Buscar</button>
      </form>
      {lista.erro && <Erro mensagem={lista.erro} tentar={lista.recarregar} />}
      {!lista.dados ? (
        <Carregando />
      ) : lista.dados.itens.length === 0 ? (
        <Vazio>Nenhum alerta com esses filtros.</Vazio>
      ) : (
        <>
          <AlertasTabela alertas={lista.dados.itens} destaque={novos} />
          {lista.dados.total > lista.dados.por_pagina && <Paginacao pagina={pagina} total={lista.dados.total} porPagina={lista.dados.por_pagina} aoMudar={setPagina} />}
        </>
      )}
    </>
  );
}
