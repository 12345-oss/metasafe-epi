import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/contexts";

const PERSONAS = [
  { email: "camila@metaindustria.com.br", nome: "Camila Nogueira", papel: "Supervisora de segurança", iniciais: "CN" },
  { email: "roberto@metaindustria.com.br", nome: "Roberto Almeida", papel: "Gestor industrial", iniciais: "RA" },
  { email: "joao@metaindustria.com.br", nome: "João Santos", papel: "Operador de produção", iniciais: "JS" },
];

export default function LoginPage() {
  const { entrar } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e?: FormEvent, credenciais?: { email: string; senha: string }) {
    e?.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const u = await entrar(credenciais?.email ?? email, credenciais?.senha ?? senha);
      nav(u.perfil === "operador" ? "/terminal" : "/", { replace: true });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <section className="login-marca">
        <div className="brand" style={{ border: 0, padding: 0 }}>
          <span className="brand-mark">M</span>
          <span>
            <strong>MetaSafe</strong>
            <small>EPI Intelligence</small>
          </span>
        </div>
        <div>
          <span className="eyebrow" style={{ color: "#8fb8e8" }}>
            Challenge 2026 · FIAP × SPI Integração · Metaindústria
          </span>
          <h1>Segurança proativa, antes que o risco vire incidente.</h1>
          <p>
            Visão computacional no edge confere os EPIs obrigatórios de cada zona, orienta o operador na hora e entrega ao supervisor
            alertas priorizados, com histórico auditável e sem punição automática.
          </p>
        </div>
        <ul className="login-pontos">
          <li>Alertas em tempo real por zona e severidade</li>
          <li>Tratamento de ocorrências com linha do tempo</li>
          <li>Relatórios de conformidade por setor e turno</li>
        </ul>
      </section>

      <section className="login-form">
        <form className="card form-card" onSubmit={enviar}>
          <span className="eyebrow">Acesso ao sistema</span>
          <h2 style={{ margin: "6px 0 18px" }}>Entrar no MetaSafe EPI</h2>
          <div className="field">
            <label htmlFor="email">E-mail corporativo</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@metaindustria.com.br" />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && (
            <p className="erro-form" role="alert">
              {erro}
            </p>
          )}
          <button className="button button-primary" style={{ width: "100%", marginTop: 18 }} disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          <div className="personas">
            <span className="eyebrow">Acesso rápido da demonstração · senha metasafe123</span>
            {PERSONAS.map((p) => (
              <button type="button" key={p.email} className="persona" disabled={enviando} onClick={() => enviar(undefined, { email: p.email, senha: "metasafe123" })}>
                <span className="person-avatar">{p.iniciais}</span>
                <span>
                  <strong>{p.nome}</strong>
                  <small>{p.papel}</small>
                </span>
                <b>→</b>
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
