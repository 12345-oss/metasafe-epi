import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Carregando, InfoBanner, PageHead, Voltar } from "../components/ui";
import { api } from "../lib/api";
import { useAuth, useDados, useToast } from "../lib/contexts";
import type { OperadorResumo, ZonaResumo } from "../lib/types";

export default function OperadorFormPage() {
  const { id } = useParams();
  const edicao = Boolean(id);
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { mostrar } = useToast();
  const { dados: zonas } = useDados<ZonaResumo[]>("/api/zonas");
  const [form, setForm] = useState({ nome: "", matricula: "", setor: "", turno: "A", status_operacional: "em_operacao" });
  const [carregado, setCarregado] = useState(!edicao);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!edicao) return;
    api<OperadorResumo>(`/api/operadores/${id}`).then((o) => {
      setForm({ nome: o.nome, matricula: o.matricula, setor: o.setor, turno: o.turno, status_operacional: o.status_operacional });
      setCarregado(true);
    });
  }, [edicao, id]);

  const setores = [...new Set((zonas ?? []).map((z) => z.setor))].sort();
  useEffect(() => {
    if (!form.setor && setores.length) setForm((f) => ({ ...f, setor: setores[0] }));
  }, [setores, form.setor]);

  if (usuario?.perfil !== "supervisor") {
    return <InfoBanner tipo="warning" icone="!" titulo="Somente o supervisor de segurança cadastra operadores." />;
  }
  if (!carregado) return <Carregando />;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const o = await api<OperadorResumo>(edicao ? `/api/operadores/${id}` : "/api/operadores", { method: edicao ? "PUT" : "POST", json: form });
      mostrar({
        tipo: "sucesso",
        titulo: edicao ? "Operador atualizado" : "Operador cadastrado",
        mensagem: edicao ? "Alteração registrada no log de auditoria." : "O colaborador já pode ser associado a eventos de monitoramento.",
      });
      nav(`/operadores/${o.id}`);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const campo = (k: keyof typeof form) => ({ value: form[k], onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  return (
    <>
      <Voltar para={edicao ? `/operadores/${id}` : "/operadores"} rotulo={edicao ? "Voltar para o perfil" : "Voltar para operadores"} />
      <PageHead
        eyebrow="RF02 · Cadastro de colaborador"
        titulo={edicao ? "Editar operador" : "Cadastrar operador"}
        descricao="Registre somente os dados operacionais necessários para monitoramento e orientação preventiva."
      />
      <InfoBanner icone="LG" titulo="Minimização de dados ativa (LGPD · RNF05)">
        O MVP não utiliza reconhecimento facial. A identificação prioriza matrícula/crachá, zona e turno.
      </InfoBanner>
      <form className="card form-card" onSubmit={salvar}>
        <div className="form-grid">
          <div className="field form-span">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" required minLength={3} placeholder="Ex.: Pedro Oliveira" {...campo("nome")} />
          </div>
          <div className="field">
            <label htmlFor="mat">Matrícula / crachá</label>
            <input id="mat" required minLength={3} placeholder="Ex.: OP-1950" {...campo("matricula")} />
          </div>
          <div className="field">
            <label htmlFor="status">Status operacional</label>
            <select id="status" {...campo("status_operacional")}>
              <option value="em_operacao">Em operação</option>
              <option value="fora_de_area">Fora de área</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="setor">Setor</label>
            <select id="setor" {...campo("setor")}>
              {setores.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="turno">Turno</label>
            <select id="turno" {...campo("turno")}>
              <option value="A">Turno A (06h–14h)</option>
              <option value="B">Turno B (14h–22h)</option>
              <option value="C">Turno C (22h–06h)</option>
            </select>
          </div>
        </div>
        {erro && (
          <p className="erro-form" role="alert">
            {erro}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => nav(-1)}>
            Cancelar
          </button>
          <button className="button button-primary" disabled={enviando}>
            {enviando ? "Salvando…" : edicao ? "Salvar alterações" : "Cadastrar operador"}
          </button>
        </div>
      </form>
    </>
  );
}
