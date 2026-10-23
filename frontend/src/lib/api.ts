const CHAVE_TOKEN = "metasafe.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* navegação privada: a sessão vale só até recarregar a página */
  }
}

let aoExpirar: (() => void) | null = null;
export function onSessaoExpirada(fn: () => void) {
  aoExpirar = fn;
}

function mensagemDeErro(corpo: unknown, status: number): string {
  const detail = (corpo as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d: { loc?: string[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? "campo"}: ${d.msg ?? "inválido"}`)
      .join(" · ");
  }
  return status >= 500 ? "Erro no servidor. Tente novamente." : `Falha na requisição (${status}).`;
}

export async function api<T>(caminho: string, opcoes: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(opcoes.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = opcoes.body;
  if (opcoes.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opcoes.json);
  }
  let resp: Response;
  try {
    resp = await fetch(caminho, { ...opcoes, headers, body });
  } catch {
    throw new ApiError(0, "Não foi possível conectar à API. Verifique se o backend está em execução.");
  }
  if (resp.status === 401 && token) {
    setToken(null);
    aoExpirar?.();
  }
  const texto = await resp.text();
  const corpo = texto ? safeJson(texto) : null;
  if (!resp.ok) throw new ApiError(resp.status, mensagemDeErro(corpo, resp.status));
  return corpo as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

/** Baixa um arquivo autenticado (CSV) e dispara o download no navegador. */
export async function baixar(caminho: string, nomePadrao: string) {
  const resp = await fetch(caminho, { headers: { Authorization: `Bearer ${getToken() ?? ""}` } });
  if (!resp.ok) throw new ApiError(resp.status, "Não foi possível gerar o arquivo.");
  const blob = await resp.blob();
  const disp = resp.headers.get("Content-Disposition") ?? "";
  const nome = /filename="([^"]+)"/.exec(disp)?.[1] ?? nomePadrao;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
