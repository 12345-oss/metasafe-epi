import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, getToken, onSessaoExpirada, setToken } from "./api";
import type { MensagemTempoReal, Usuario } from "./types";

// ---------------------------------------------------------------------------
// Autenticação (RF01)
// ---------------------------------------------------------------------------
interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => void;
}
const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    onSessaoExpirada(() => setUsuario(null));
    if (!getToken()) {
      setCarregando(false);
      return;
    }
    api<Usuario>("/api/auth/me")
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await api<{ access_token: string; usuario: Usuario }>("/api/auth/login", { method: "POST", json: { email, senha } });
    setToken(r.access_token);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const sair = useCallback(() => {
    setToken(null);
    setUsuario(null);
  }, []);

  return <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
export interface Toast {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: "sucesso" | "erro" | "alerta" | "info";
  acao?: { rotulo: string; href: string };
}
interface ToastCtx {
  toasts: Toast[];
  mostrar: (t: Omit<Toast, "id">) => void;
  fechar: (id: number) => void;
}
const ToastContext = createContext<ToastCtx>(null!);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const fechar = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const mostrar = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      setTimeout(() => fechar(id), t.tipo === "alerta" ? 9000 : 4500);
    },
    [fechar],
  );
  return <ToastContext.Provider value={{ toasts, mostrar, fechar }}>{children}</ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Tempo real (WebSocket · RNF01)
// ---------------------------------------------------------------------------
type Ouvinte = (m: MensagemTempoReal) => void;
interface RealtimeCtx {
  conectado: boolean;
  assinar: (fn: Ouvinte) => () => void;
}
const RealtimeContext = createContext<RealtimeCtx>(null!);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [conectado, setConectado] = useState(false);
  const ouvintes = useRef(new Set<Ouvinte>());

  useEffect(() => {
    if (!usuario) return;
    let ws: WebSocket | null = null;
    let encerrado = false;
    let tentativa = 0;
    let ping: ReturnType<typeof setInterval>;
    let religar: ReturnType<typeof setTimeout>;

    const conectar = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws/alertas?token=${encodeURIComponent(getToken() ?? "")}`);
      ws.onopen = () => {
        tentativa = 0;
        setConectado(true);
        ping = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send("ping"), 25000);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as MensagemTempoReal;
          ouvintes.current.forEach((fn) => fn(msg));
        } catch {
          /* ignora mensagens inválidas */
        }
      };
      ws.onclose = () => {
        clearInterval(ping);
        setConectado(false);
        if (!encerrado) religar = setTimeout(conectar, Math.min(15000, 1000 * 2 ** tentativa++));
      };
    };
    conectar();
    return () => {
      encerrado = true;
      clearTimeout(religar);
      clearInterval(ping);
      ws?.close();
    };
  }, [usuario]);

  const assinar = useCallback((fn: Ouvinte) => {
    ouvintes.current.add(fn);
    return () => {
      ouvintes.current.delete(fn);
    };
  }, []);

  const valor = useMemo(() => ({ conectado, assinar }), [conectado, assinar]);
  return <RealtimeContext.Provider value={valor}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);

/** Executa `fn` a cada mensagem em tempo real (com referência sempre atualizada). */
export function useTempoReal(fn: Ouvinte) {
  const { assinar } = useRealtime();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => assinar((m) => ref.current(m)), [assinar]);
}

// ---------------------------------------------------------------------------
// Carregamento de dados
// ---------------------------------------------------------------------------
export function useDados<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!caminho) return;
    let ativo = true;
    setCarregando(true);
    api<T>(caminho)
      .then((d) => ativo && (setDados(d), setErro(null)))
      .catch((e: Error) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [caminho, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { dados, erro, carregando, recarregar, setDados };
}
