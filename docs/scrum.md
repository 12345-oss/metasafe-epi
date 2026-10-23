# Scrum consolidado — MetaSafe EPI

Este documento reúne os artefatos Scrum das quatro Sprints, com foco na Sprint 4 (entrega final). O board do Trello é a fonte do dia a dia; aqui fica o registro consolidado para avaliação.

> **Para o grupo:** os trechos marcados com ✏️ dependem de informação que só vocês têm (quem fez o quê, datas das cerimônias, feedback recebido). Preencham antes da entrega — registros reais de uso do Scrum contam como diferencial na avaliação.

**Board Trello (Sprint 4):** https://trello.com/b/5ZEjgFwj/metasafe-epi-sprint-4-entrega-final

O board das Sprints 1–3 (https://trello.com/invite/b/6aa9a0d60c198ec8e4172a1c/ATTI9f167e47079418fd46ba63b16020e4a10E3CC86E/metasafe-epi-sprint-3) ficou na conta de um integrante que não tem mais acesso para liberar novos membros. Por isso a Sprint 4 continua num board novo, que traz o histórico das Sprints anteriores na lista "Histórico (Sprints 1–3)".

## 1. Papéis

| Papel | Integrante |
| --- | --- |
| Product Owner | ✏️ |
| Scrum Master | ✏️ |
| Time de desenvolvimento | Juan Alberto Lenis Rodriguez, Henrique Monteiro Khouri, Rodrigo Arantes da Silva Philippi, Celso Fernando Ferrer Singh, Kagio Miura Neto |

## 2. Evolução das Sprints

| Sprint | Meta | Incremento entregue |
| --- | --- | --- |
| 1 | Entender o problema da Metaindústria e modelar a solução | Personas, RF01–RF16, RNF01–RNF12, RN01–RN08, restrições, casos de uso, atividades e classes |
| 2 | Transformar requisitos em experiência navegável | Protótipo HTML/CSS/JS com fluxos de operador, alerta, zona e relatório; vídeo walkthrough |
| 3 | Evoluir o protótipo e organizar o trabalho com Scrum | Central de Alertas, Detalhes e Histórico de Ocorrências no Figma; fluxo arquitetural refinado; board Trello |
| 4 | Entregar o produto funcional e consolidar a documentação | Aplicação completa (API, motor de regras, banco, tempo real, interface), dados simulados, testes, Docker, documentação e pitch |

## 3. Product Backlog (estado final)

Prioridade: **Essencial**, **Importante** ou **Desejável**, herdada da Sprint 1.

| ID | História de usuário | Requisitos | Prioridade | Sprint | Status |
| --- | --- | --- | --- | --- | --- |
| PB01 | Como usuário, quero entrar com meu perfil para ver só o que me cabe | RF01 | Essencial | 4 | ✅ Concluído |
| PB02 | Como supervisora, quero cadastrar operadores com matrícula, setor, turno e status | RF02 | Essencial | 2 (protótipo) → 4 | ✅ Concluído |
| PB03 | Como supervisora, quero configurar zonas com matriz de EPIs, nível de risco e limiares | RF03, RF14, RN01 | Essencial | 2 → 4 | ✅ Concluído |
| PB04 | Como sistema, quero receber eventos das câmeras e sensores por zona | RF04 | Essencial | 4 | ✅ Concluído (gateway simulado) |
| PB05 | Como sistema, quero comparar detecções com a matriz da zona e respeitar o limiar | RF05, RF06, RN02 | Essencial | 4 | ✅ Concluído |
| PB06 | Como supervisora, quero alertas priorizados e notificação imediata quando a severidade for média ou crítica | RF07, RF08, RN03, RNF01 | Essencial | 3 (Figma) → 4 | ✅ Concluído |
| PB07 | Como operador, quero saber na hora qual EPI está faltando e o que fazer | RF09, UC06 | Importante | 2 → 4 | ✅ Concluído |
| PB08 | Como supervisora, quero tratar a ocorrência: assumir, comentar, classificar, encerrar ou escalar | RF10, RF11, RN04 | Essencial | 3 → 4 | ✅ Concluído |
| PB09 | Como supervisora, quero diferenciar esquecimento pontual de risco recorrente | RN05 | Essencial | 4 | ✅ Concluído |
| PB10 | Como supervisora, quero consultar o histórico de ocorrências | RF10, RNF07 | Essencial | 3 → 4 | ✅ Concluído |
| PB11 | Como gestor, quero um painel de conformidade por área, turno e período | RF12 | Essencial | 2 → 4 | ✅ Concluído |
| PB12 | Como gestor, quero exportar relatórios em CSV e PDF sem expor nomes | RF13, RN08 | Importante | 2 → 4 | ✅ Concluído |
| PB13 | Como manutenção, quero ser avisado de câmeras e sensores com falha, sem culpar o operador | RF16, RN07 | Importante | 4 | ✅ Concluído |
| PB14 | Como ERP/MES, quero receber eventos consolidados por API ou arquivo | RF15 | Desejável | 4 | ✅ Concluído |
| PB15 | Como auditor, quero log de quem alterou regras e cadastros | RNF07 | Essencial | 4 | ✅ Concluído |
| PB16 | Como equipe, queremos mensageria MQTT entre gateway e servidor | RNF10 | Importante | — | ⏭️ Próximo ciclo |
| PB17 | Como equipe, queremos PoC com câmera real e modelo YOLO/ONNX | RF05, RNF02 | Importante | — | ⏭️ Próximo ciclo |
| PB18 | Como TI da planta, queremos Prometheus/Grafana e backups automatizados | RNF11, RNF12 | Importante | — | ⏭️ Próximo ciclo |
| PB19 | Como gateway, queremos operar em modo degradado por 30 minutos sem servidor | RNF04 | Importante | — | ⏭️ Próximo ciclo |

## 4. Sprint 4 — Planning

**Meta da Sprint:** entregar o MetaSafe EPI funcionando de ponta a ponta — evento de câmera → regra → alerta em tempo real → tratamento → relatório — com documentação consolidada e pitch gravado.

**Data da Planning:** ✏️ · **Duração da Sprint:** ✏️ · **Participantes:** ✏️

**Critérios de aceite da Sprint (do enunciado):**

- O avaliador instala, executa e navega seguindo apenas o README.
- Os fluxos principais do protótipo funcionam com dados da Metaindústria (reais ou simulados).
- README, arquitetura e artefatos Scrum consolidados.
- Vídeo de pitch de até 5 minutos com protagonismo do grupo.
- Board Trello com Sprint Backlog finalizado e ata da Review.

## 5. Sprint 4 — Sprint Backlog

Estimativa em pontos (escala de Fibonacci). ✏️ Ajustem as estimativas e os responsáveis para refletir o que o grupo combinou.

| # | Item | Histórias | Pontos | Responsável | Status |
| --- | --- | --- | --- | --- | --- |
| S4-01 | Estrutura do repositório, Docker Compose e ambiente sem Docker | — | 3 | ✏️ | ✅ |
| S4-02 | Modelo de dados a partir do diagrama de classes e dados simulados da Metaindústria | PB02–PB05 | 5 | ✏️ | ✅ |
| S4-03 | Autenticação JWT e perfis operador, supervisor e gestor | PB01 | 3 | ✏️ | ✅ |
| S4-04 | Motor de regras: matriz, limiar, severidade, reincidência e recorrência | PB05, PB09 | 8 | ✏️ | ✅ |
| S4-05 | Ingestão do Edge AI, saúde de dispositivos e simulador | PB04, PB13 | 5 | ✏️ | ✅ |
| S4-06 | WebSocket de alertas e notificação do supervisor | PB06 | 3 | ✏️ | ✅ |
| S4-07 | Telas Visão geral e Monitoramento ao vivo | PB06, PB11 | 5 | ✏️ | ✅ |
| S4-08 | Central de alertas, Tratamento e Histórico de ocorrências | PB06, PB08, PB10 | 8 | ✏️ | ✅ |
| S4-09 | Operadores & EPIs e Terminal de campo | PB02, PB07 | 5 | ✏️ | ✅ |
| S4-10 | Zonas & regras com auditoria | PB03, PB15 | 5 | ✏️ | ✅ |
| S4-11 | Relatórios, exportação CSV/PDF e integração ERP/MES | PB11, PB12, PB14 | 5 | ✏️ | ✅ |
| S4-12 | Testes automatizados da API | todas | 3 | ✏️ | ✅ |
| S4-13 | README, arquitetura final, manual de uso, rastreabilidade e Scrum consolidado | — | 5 | ✏️ | ✅ |
| S4-14 | Roteiro, gravação e edição do vídeo de pitch | — | 5 | ✏️ | ✏️ |
| S4-15 | Atualização do Trello e ata da Review | — | 1 | ✏️ | ✏️ |
| | **Total** | | **69** | | |

## 6. Daily Scrum

Registrar ao menos as Dailies em que houve impedimento ou mudança de plano. ✏️

| Data | Integrante | O que fiz | O que vou fazer | Impedimentos |
| --- | --- | --- | --- | --- |
| ✏️ | Juan | | | |
| ✏️ | Henrique | | | |
| ✏️ | Rodrigo | | | |
| ✏️ | Celso | | | |
| ✏️ | Kagio | | | |

## 7. Sprint Review final — ata

| Campo | Registro |
| --- | --- |
| Data e duração | ✏️ |
| Participantes | ✏️ |
| Meta da Sprint | Produto funcional de ponta a ponta + documentação + pitch |
| Resultado | ✏️ Meta atingida / parcialmente atingida |

**Incremento demonstrado**

1. Login por persona e permissões diferentes para supervisor, gestor e operador.
2. Simulação de evento de câmera gerando alerta crítico em tempo real na Visão geral, na Central de alertas e no terminal da zona.
3. Operador confirmando a orientação no terminal; a confirmação aparecendo na linha do tempo do alerta.
4. Tratamento completo: assumir, comentar, encerrar com classificação e ação preventiva; escalonamento quando o risco persiste.
5. Detecção abaixo do limiar registrada como inconclusiva, sem alerta (RN02).
6. Falha de câmera gerando alerta técnico sem operador (RN07).
7. Alteração de limiar em uma zona registrada no log de auditoria.
8. Relatório de conformidade por setor e turno, com exportação CSV e PDF.
9. Execução com `docker compose up --build` e suíte de 20 testes passando.

**Itens do Sprint Backlog concluídos:** S4-01 a S4-13 ✏️ (+ S4-14 e S4-15 após a gravação e a atualização do board).

**Feedback recebido:** ✏️

**Decisões e itens que voltam ao Product Backlog:** PB16 (MQTT), PB17 (PoC com câmera real), PB18 (observabilidade e backups), PB19 (modo degradado). ✏️ Acrescentar o que surgir na Review.

## 8. Sprint Retrospective

✏️ Preencher em conjunto, com pelo menos um ponto por integrante.

| O que funcionou bem | O que pode melhorar | Ações para o próximo ciclo |
| --- | --- | --- |
| | | |

## 9. Definition of Done (versão final)

Uma história está pronta quando:

- O código está no repositório, na branch principal, e o projeto sobe com `docker compose up --build` e sem Docker.
- As regras de negócio envolvidas têm teste automatizado passando (`pytest`).
- A tela segue o padrão visual do protótipo da Sprint 2 e foi navegada com a persona correspondente.
- O requisito (RF/RNF/RN) está registrado em [rastreabilidade.md](rastreabilidade.md).
- README e manual de uso refletem a funcionalidade.
- O card está em "Concluído" no Trello.
- Não há pendência conhecida — ou ela foi registrada no Product Backlog.

## 10. Métricas da Sprint 4

| Métrica | Valor |
| --- | --- |
| Pontos planejados | 69 ✏️ (ajustar se as estimativas mudarem) |
| Pontos concluídos | ✏️ |
| Testes automatizados | 20 passando |
| Requisitos funcionais da Sprint 1 atendidos | 16 de 16 (RF04/RF05 com gateway simulado) |
