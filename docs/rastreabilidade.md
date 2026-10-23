# Rastreabilidade — requisitos da Sprint 1 → produto da Sprint 4

Cada requisito levantado na Sprint 1 ([requisitos.md](requisitos.md)), a tela do protótipo da Sprint 2 que o representava e onde ele está implementado e testado na entrega final. Testes em `backend/tests/test_api.py`.

## Requisitos funcionais

| ID | Requisito (resumo) | Tela do protótipo (S2/S3) | Tela no produto | API / código | Teste |
| --- | --- | --- | --- | --- | --- |
| RF01 | Autenticação e funcionalidades por perfil | Seletor de persona | Login, menu por perfil | `routers/auth.py`, `deps.py` | `test_login_invalido`, `test_rotas_exigem_token`, `test_perfis` |
| RF02 | Cadastro de operadores (matrícula, setor, turno, status) | O02 Cadastro de operador | Operadores & EPIs → Cadastrar | `POST/PUT /api/operadores` | `test_matricula_unica` |
| RF03 | Zonas com risco, severidade e EPIs obrigatórios | Z01/Z02 Zonas & regras | Zonas & regras → Configuração | `POST/PUT /api/zonas` | `test_alteracao_de_regra_gera_auditoria` |
| RF04 | Receber eventos de câmeras e sensores por zona | M01 Monitoramento | Monitoramento ao vivo | `POST /api/eventos`, `edge-simulator/` | `test_chave_de_dispositivo` |
| RF05 | Identificar EPIs presentes no evento | M01 | Tratamento (evidência) | contrato `deteccoes` do evento | `test_evento_conforme_nao_gera_alerta` |
| RF06 | Comparar detecções com a matriz da zona | O03 Perfil do operador | Perfil do operador (matriz × última detecção) | `regras.avaliar_evento` | `test_ausencia_gera_alerta_com_severidade_da_zona` |
| RF07 | Alerta preventivo por ausência de EPI | A01 Central de alertas | Central de alertas, Visão geral | `regras.avaliar_evento` | idem |
| RF08 | Notificar supervisor em severidade média/crítica | A01 | Notificação em tempo real + contador | `notificou_supervisor`, `/ws/alertas` | `test_ausencia_gera_alerta...`, `test_severidade_baixa_so_orienta_operador`, `test_websocket_recebe_alerta` |
| RF09 | Orientar o operador sobre o EPI ausente | A02 Alerta preventivo do operador | Terminal de campo | `GET /api/terminal/{zona}`, `confirmar-orientacao` | `test_operador_confirma_orientacao` |
| RF10 | Registrar ocorrência com data, zona, evidência, severidade, status e responsável | A03 Detalhe da ocorrência | Tratamento de ocorrência, Histórico | `GET /api/alertas/{id}` | `test_fluxo_de_tratamento` |
| RF11 | Classificar, comentar, encerrar ou escalar | A03 | Tratamento de ocorrência | `/assumir`, `/comentarios`, `/encerrar`, `/escalar` | `test_fluxo_de_tratamento`, `test_escalar` |
| RF12 | Dashboard por área, linha, turno, tipo de EPI e período | D01, R01 | Visão geral, Relatórios | `GET /api/dashboard`, `GET /api/relatorios/conformidade` | `test_dashboard_e_relatorio` |
| RF13 | Relatório em PDF ou CSV | R02 | Relatórios (CSV e PDF), Histórico (CSV) | `.../conformidade.csv`, `/api/alertas/exportar.csv` | `test_exportacoes_sem_nomes` |
| RF14 | Limiares de confiança configuráveis | Z02 | Zonas & regras (limiar por EPI) | `RequisitoEPI.confianca_minima` | `test_abaixo_do_limiar_nao_gera_alerta` |
| RF15 | Exportar eventos para ERP/MES | — (UC12) | API | `GET /api/integracao/eventos` (JSON/CSV) | `test_exportacoes_sem_nomes` |
| RF16 | Registrar falhas de câmera e sensor | M01 (saúde) | Monitoramento → Simular falha | `POST /api/dispositivos/{id}/status` | `test_falha_de_dispositivo_gera_alerta_tecnico` |

## Regras de negócio

| ID | Regra | Implementação | Teste |
| --- | --- | --- | --- |
| RN01 | Toda zona tem matriz de EPIs obrigatórios | Validação em `routers/zonas.py` (ao menos um obrigatório) | `test_alteracao_de_regra_gera_auditoria` |
| RN02 | Alerta só acima do limiar de confiança | Resultado `abaixo_limiar` → evento inconclusivo | `test_abaixo_do_limiar_nao_gera_alerta` |
| RN03 | Crítico notifica o supervisor imediatamente | `precisa_notificar` + WebSocket | `test_websocket_recebe_alerta` |
| RN04 | Só supervisor ou perfil superior encerra | Dependência `TRATAMENTO` | `test_fluxo_de_tratamento` (operador recebe 403) |
| RN05 | Diferenciar orientação pontual de recorrência | `recorrente` (2+ alertas em 7 dias), reincidência em 10 min | `test_recorrencia_rn05`, `test_reincidencia_reforca_o_mesmo_alerta` |
| RN06 | Nenhuma advertência automática | Não existe ação disciplinar no sistema; textos orientativos | — (revisão de interface) |
| RN07 | Falha de dispositivo gera alerta técnico | Categoria `tecnico`, sem operador | `test_falha_de_dispositivo_gera_alerta_tecnico` |
| RN08 | Relatórios consolidados, sem exposição desnecessária | Relatórios agregados; CSV e integração só com matrícula | `test_exportacoes_sem_nomes` |

## Requisitos não funcionais

Situação de cada RNF em [arquitetura.md, seção 8](arquitetura.md#8-requisitos-não-funcionais).

## Casos de uso

| Caso de uso | Onde está |
| --- | --- |
| UC01 Autenticar usuário | Login |
| UC02 Registrar entrada em área operacional | Crachá (`matricula`) no evento do gateway |
| UC03 Monitorar uso de EPI | Monitoramento ao vivo |
| UC04 Validar conformidade por zona | Motor de regras |
| UC05 Emitir alerta de risco | Motor de regras + Central de alertas |
| UC06 Orientar operador | Terminal de campo |
| UC07 Notificar supervisor | Notificação em tempo real |
| UC08 Tratar ocorrência | Tratamento de ocorrência |
| UC09 Consultar dashboard | Visão geral |
| UC10 Gerar relatório de conformidade | Relatórios |
| UC11 Configurar zonas, EPIs e limiares | Zonas & regras |
| UC12 Exportar eventos para ERP/MES | `GET /api/integracao/eventos` |
