# Trello — conteúdo do board da Sprint 4

Board publicado: https://trello.com/b/5ZEjgFwj/metasafe-epi-sprint-4-entrega-final

O enunciado pede o **Sprint Backlog da Sprint 4 finalizado** e a **ata da Review final** no board. Abaixo está o conteúdo pronto para colar. Os itens com ✏️ precisam de informação do grupo.

## Listas sugeridas

`Product Backlog` · `Sprint 4 — Backlog` · `Em andamento` · `Em revisão` · `Concluído (Sprint 4)` · `Review & Retro`

## Cartões da Sprint 4

Criar um cartão por linha, com a etiqueta **Sprint 4**, o responsável e o checklist indicado. Ao final, todos em **Concluído (Sprint 4)**.

| Cartão | Descrição | Checklist |
| --- | --- | --- |
| S4-01 · Ambiente e Docker | Repositório, Docker Compose (db, api, web, edge) e execução sem Docker | Compose sobe tudo · README com instruções · `.gitignore` |
| S4-02 · Modelo de dados e dados simulados | Tabelas a partir do diagrama de classes; 40 dias de operação simulada | Zonas e matriz · Operadores · Dispositivos · Eventos e alertas |
| S4-03 · Login e perfis (RF01) | JWT, perfis operador/supervisor/gestor | Login · Rotas protegidas · Teste de perfis |
| S4-04 · Motor de regras (RF05–RF08, RN02, RN05) | Matriz × detecções, limiar, severidade, reincidência e recorrência | Limiar · Severidade · Reincidência · Recorrência · Testes |
| S4-05 · Ingestão Edge AI e dispositivos (RF04, RF16) | `POST /api/eventos`, saúde de dispositivos, simulador | Chave de dispositivo · Alerta técnico · Script do simulador |
| S4-06 · Tempo real (RNF01) | WebSocket de alertas e notificação do supervisor | Hub WebSocket · Reconexão · Teste |
| S4-07 · Visão geral e Monitoramento | Telas D01 e M01 do protótipo | KPIs · Zonas · Eventos ao vivo · Saúde |
| S4-08 · Alertas, tratamento e histórico (RF10, RF11) | Telas da Sprint 3: Central, Detalhe e Histórico | Filtros · Assumir · Encerrar · Escalar · CSV |
| S4-09 · Operadores e terminal (RF02, RF09) | Cadastro, perfil do operador e terminal de campo | Cadastro · Matriz × detecção · Confirmar orientação |
| S4-10 · Zonas e regras (RF03, RF14, RNF07) | Matriz de EPIs, limiares e auditoria | Edição · Validação RN01 · Log de auditoria |
| S4-11 · Relatórios e integração (RF12, RF13, RF15) | Relatórios, CSV/PDF, API ERP/MES | Filtros · CSV · PDF · Endpoint de integração |
| S4-12 · Testes automatizados | Suíte pytest por requisito | 20 testes passando |
| S4-13 · Documentação final | README, arquitetura, manual, rastreabilidade, Scrum | Revisão por todos |
| S4-14 · Vídeo de pitch | Roteiro, gravação, edição e publicação não listada | Roteiro · Gravação · Edição · Link no README |
| S4-15 · Review e entrega | Ata da Review, retrospectiva e arquivo `.txt` | Ata · Retro · `.txt` enviado |

## Cartão "Ata da Sprint Review — Sprint 4"

Colar na descrição do cartão, na lista **Review & Retro**:

```
SPRINT REVIEW — SPRINT 4 (ENTREGA FINAL)
Data: ✏️   Duração: ✏️
Participantes: ✏️

Meta da Sprint
Entregar o MetaSafe EPI funcionando de ponta a ponta (evento de câmera → regra → alerta em
tempo real → tratamento → relatório), com documentação consolidada e pitch gravado.

Incremento demonstrado
1. Login por persona com permissões diferentes (supervisora, gestor, operador).
2. Evento simulado do Edge AI gerando alerta crítico em tempo real.
3. Orientação ao operador no terminal de campo e confirmação registrada.
4. Tratamento completo da ocorrência: assumir, comentar, encerrar ou escalar.
5. Detecção abaixo do limiar sem alerta (RN02) e falha de câmera como alerta técnico (RN07).
6. Alteração de regra registrada em auditoria.
7. Relatórios por setor, zona e turno com exportação CSV e PDF.
8. docker compose up --build e 20 testes automatizados passando.

Resultado: ✏️ meta atingida / parcialmente atingida
Itens concluídos: S4-01 a S4-15 ✏️

Feedback recebido: ✏️

Itens para o Product Backlog
- MQTT entre gateway e API
- PoC com câmera real e modelo YOLO/ONNX
- Prometheus/Grafana e backups automatizados
- Modo degradado do gateway (RNF04)
✏️ outros pontos levantados na Review
```

## Cartão "Retrospectiva — Sprint 4"

```
O que funcionou bem: ✏️
O que pode melhorar: ✏️
Ações: ✏️
```
