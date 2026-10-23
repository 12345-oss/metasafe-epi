const TZ = "America/Sao_Paulo";

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function hora(iso: string | null | undefined, segundos = true): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    ...(segundos ? { second: "2-digit" } : {}),
  });
}

export function dia(isoData: string): string {
  const [a, m, d] = isoData.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function diaSemana(isoData: string): string {
  const [a, m, d] = isoData.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

export function relativo(iso: string | null | undefined, agora = Date.now()): string {
  if (!iso) return "—";
  const seg = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 1000));
  if (seg < 45) return "agora";
  const min = Math.round(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

export function pct(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function confianca(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
}

export function minutos(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v < 1) return `${Math.round(v * 60)}s`;
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}min`;
  return s ? `${m}min ${s}s` : `${m}min`;
}

export function numero(v: number): string {
  return v.toLocaleString("pt-BR");
}

export function saudacao(): string {
  const h = Number(new Date().toLocaleString("pt-BR", { timeZone: TZ, hour: "2-digit", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
