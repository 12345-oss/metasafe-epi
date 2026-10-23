import { useState } from "react";
import AlertasTabela from "../components/AlertasTabela";
import { Carregando, Erro, PageHead, Paginacao, Vazio } from "../components/ui";
import { baixar, qs } from "../lib/api";
import { useDados, useToast } from "../lib/contexts";
import type { Alerta, Pagina, ZonaResumo } from "../lib/types";

function hojeMenos(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export default function HistoricoPage() {
  const { mostrar } = useToast();
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ status: "encerrado,escalado", severidade: "", categoria: "", zona_id: "", q: "", de: hojeMenos(30), ate: hojeMenos(0) });
  const [pagina, setPagina] = useState(1);
  const { dados, erro, recarregar } = useDados<Pagina<Alerta>>(`/api/alertas${qs({ ...filtros, pagina, por_pagina: 20 })}`);
  const { dados: zonas } = useDados<ZonaResumo[]>("/api/zonas");
  const mudar = (campo: keyof typeof filtros, valor: string) => {
    setPagina(1);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  };

  return (
    <>
      <PageHead
        eyebrow="RF10 · RNF07 · Sprint 3"
        titulo="Histórico de ocorrências"
        descricao="Consulte ocorrências já tratadas, com classificação, responsável e ação preventiva registrada."
        acoes={
          <button
            className="button button-primary"
            onClick={() => baixar(`/api/alertas/exportar.csv${qs(filtros)}`, "ocorrencias.csv").catch((e) => mostrar({ tipo: "erro", titulo: "Exportação falhou", mensagem: e.message }))}
          >
            Exportar CSV
          </button>
        }
      />
      <form
        className="filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          mudar("q", busca);
        }}
      >
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Título ou matrícula" />
        </div>
        <div className="field">
          <label htmlFor="de">De</label>
          <input id="de" type="date" value={filtros.de} onChange={(e) => mudar("de", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ate">Até</label>
          <input id="ate" type="date" value={filtros.ate} onChange={(e) => mudar("ate", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="st">Status</label>
          <select id="st" value={filtros.status} onChange={(e) => mudar("status", e.target.value)}>
            <option value="encerrado,escalado">Finalizadas</option>
            <option value="encerrado">Encerradas</option>
            <option value="escalado">Escaladas</option>
            <option value="">Todas</option>
          </select>
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
      {erro && <Erro mensagem={erro} tentar={recarregar} />}
      {!dados ? (
        <Carregando />
      ) : dados.itens.length === 0 ? (
        <Vazio>Nenhuma ocorrência no período.</Vazio>
      ) : (
        <>
          <AlertasTabela alertas={dados.itens} historico />
          <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina} aoMudar={setPagina} />
        </>
      )}
    </>
  );
}
