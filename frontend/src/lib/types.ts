export type Perfil = "operador" | "supervisor" | "gestor";
export type Severidade = "baixa" | "media" | "critica";
export type StatusAlerta = "ativo" | "em_tratamento" | "encerrado" | "escalado";
export type NivelRisco = "medio" | "alto" | "critico";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  perfil_label: string;
  iniciais: string;
  operador_id: number | null;
}

export interface OperadorResumo {
  id: number;
  matricula: string;
  nome: string;
  iniciais: string;
  setor: string;
  turno: "A" | "B" | "C";
  status_operacional: "em_operacao" | "fora_de_area" | "inativo";
  status_label: string;
}

export interface OperadorLista extends OperadorResumo {
  situacao: "acao_necessaria" | "conforme" | "sem_evento";
  alertas_pendentes: number;
  zona_recente: string | null;
  ultimo_evento: string | null;
  conformidade_30d: number | null;
}

export interface ItemDeteccao {
  epi: string;
  nome: string;
  norma?: string;
  presente: boolean;
  confianca: number | null;
  limiar: number;
  resultado: "conforme" | "ausente" | "abaixo_limiar" | "nao_avaliado";
}

export interface Evento {
  id: number;
  codigo: string;
  criado_em: string;
  zona_id: number;
  zona: string;
  dispositivo: string | null;
  operador: OperadorResumo | null;
  origem: string;
  status_conformidade: "conforme" | "nao_conforme" | "inconclusivo";
  resumo: string;
  deteccoes: ItemDeteccao[];
}

export interface Alerta {
  id: number;
  codigo: string;
  tipo: "EPI_AUSENTE" | "FALHA_DISPOSITIVO";
  tipo_label: string;
  categoria: "comportamental" | "tecnico";
  severidade: Severidade;
  severidade_label: string;
  status: StatusAlerta;
  status_label: string;
  titulo: string;
  mensagem: string;
  orientacao: string;
  zona_id: number;
  zona: string;
  setor: string;
  operador: OperadorResumo | null;
  dispositivo: string | null;
  evento: string | null;
  epis_ausentes: string[];
  confianca: number | null;
  recorrente: boolean;
  reincidencias: number;
  notificou_supervisor: boolean;
  responsavel: string | null;
  classificacao: string;
  criado_em: string;
  atualizado_em: string;
  assumido_em: string | null;
  finalizado_em: string | null;
  orientacao_confirmada_em: string | null;
}

export interface HistoricoItem {
  id: number;
  criado_em: string;
  acao: string;
  descricao: string;
  autor: string;
}

export interface AlertaDetalhe extends Alerta {
  situacao_verificada: string;
  comentario_final: string;
  deteccoes: ItemDeteccao[];
  zona_nivel_risco: NivelRisco;
  zona_nivel_risco_label: string;
  tempo_resposta_min: number | null;
  tempo_total_min: number | null;
  historico: HistoricoItem[];
}

export interface Dispositivo {
  id: number;
  identificador: string;
  tipo: "camera" | "sensor";
  descricao: string;
  zona_id: number;
  zona: string;
  status: "online" | "degradado" | "offline";
  status_label: string;
  ultimo_sinal: string | null;
}

export interface ZonaResumo {
  id: number;
  nome: string;
  setor: string;
  linha: string;
  tipo_risco: string;
  nivel_risco: NivelRisco;
  nivel_risco_label: string;
  ativa: boolean;
  epis_obrigatorios: string[];
  limiar_minimo: number | null;
  cameras: number;
  sensores: number;
  dispositivos_com_falha: number;
  conformidade_24h?: number | null;
}

export interface Requisito {
  id: number;
  tipo_epi_id: number;
  nome: string;
  norma_referencia: string;
  codigo_deteccao: string;
  confianca_minima: number;
  obrigatorio: boolean;
}

export interface Auditoria {
  id: number;
  criado_em: string;
  usuario: string;
  entidade: string;
  entidade_id: number | null;
  acao: string;
  detalhes: string;
}

export interface ZonaDetalhe extends ZonaResumo {
  requisitos: Requisito[];
  dispositivos: Dispositivo[];
  eventos_24h: number;
  auditoria: Auditoria[];
}

export interface TipoEPI {
  id: number;
  nome: string;
  descricao: string;
  norma_referencia: string;
  codigo_deteccao: string;
}

export interface Referencias {
  perfis: Record<string, string>;
  turnos: Record<string, string>;
  status_operador: Record<string, string>;
  niveis_risco: Record<string, string>;
  tipos_risco: string[];
  severidades: Record<string, string>;
  status_alerta: Record<string, string>;
  classificacoes: string[];
  situacoes_verificadas: string[];
}

export interface Pagina<T> {
  total: number;
  pagina: number;
  por_pagina: number;
  itens: T[];
}

export type MensagemTempoReal =
  | { tipo: "conectado"; usuario: string }
  | { tipo: "evento"; evento: Evento }
  | { tipo: "alerta_novo" | "alerta_atualizado"; alerta: Alerta; notificar_supervisor: boolean }
  | { tipo: "dispositivo"; dispositivo: Dispositivo };
