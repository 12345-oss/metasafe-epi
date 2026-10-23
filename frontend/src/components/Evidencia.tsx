import type { ItemDeteccao } from "../lib/types";

/**
 * Representação anonimizada do quadro capturado no edge: silhueta genérica, sem rosto,
 * com o resultado de cada EPI da matriz (RNF05 · RS07 — só a evidência necessária).
 */
export default function Evidencia({ itens, camera }: { itens: ItemDeteccao[]; camera?: string | null }) {
  const cor = (r: ItemDeteccao["resultado"]) =>
    r === "conforme" ? "#238636" : r === "ausente" ? "#c43232" : r === "abaixo_limiar" ? "#b86200" : "#73808d";
  const temRisco = itens.some((i) => i.resultado === "ausente");
  return (
    <figure className="evidencia">
      <svg viewBox="0 0 320 200" role="img" aria-label="Quadro anonimizado da detecção">
        <defs>
          <pattern id="grade" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#1f3a52" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="320" height="200" fill="#0d2236" />
        <rect width="320" height="200" fill="url(#grade)" />
        <rect x="0" y="150" width="320" height="50" fill="#132e47" />
        {/* silhueta genérica */}
        <g fill="#5f7d98">
          <circle cx="118" cy="62" r="17" />
          <path d="M92 168 L96 104 Q100 84 118 84 Q136 84 140 104 L144 168 Z" />
          <rect x="99" y="166" width="13" height="26" rx="3" />
          <rect x="124" y="166" width="13" height="26" rx="3" />
        </g>
        <rect x="104" y="52" width="28" height="18" rx="4" fill="#0d2236" opacity="0.85" />
        <text x="118" y="64" fill="#9fb6cc" fontSize="6" textAnchor="middle">
          oculto
        </text>
        <rect x="80" y="38" width="76" height="158" fill="none" stroke={temRisco ? "#ff6b6b" : "#4fd18b"} strokeWidth="2" strokeDasharray="6 4" rx="4" />
        <text x="80" y="32" fill={temRisco ? "#ff8f8f" : "#7be3a9"} fontSize="9" fontWeight="700">
          pessoa · {temRisco ? "não conforme" : "conforme"}
        </text>
        {/* resultado por EPI */}
        {itens.map((i, idx) => (
          <g key={i.epi} transform={`translate(176 ${30 + idx * 26})`}>
            <rect width="132" height="20" rx="10" fill="#081a2b" stroke={cor(i.resultado)} />
            <circle cx="11" cy="10" r="4" fill={cor(i.resultado)} />
            <text x="21" y="13.5" fill="#e8f1ff" fontSize="8.5">
              {i.nome.length > 19 ? i.nome.slice(0, 18) + "…" : i.nome} {i.confianca !== null ? `${Math.round(i.confianca * 100)}%` : ""}
            </text>
          </g>
        ))}
        <text x="10" y="16" fill="#9fb6cc" fontSize="8">
          {camera ?? "câmera"} · quadro anonimizado
        </text>
        <circle cx="306" cy="13" r="4" fill="#ff4d4d" />
      </svg>
      <figcaption>Evidência minimizada: apenas o resultado da detecção é armazenado, sem imagem do rosto.</figcaption>
    </figure>
  );
}
