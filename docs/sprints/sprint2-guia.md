# MetaSafe EPI — Guia da Sprint 2

## 1. Conceito do protótipo

O MetaSafe EPI é uma aplicação operacional de segurança industrial que identifica riscos relacionados ao uso de EPIs antes que se tornem incidentes. O protótipo conecta a experiência de três personas:

- **João Santos, operador de produção:** recebe orientações preventivas curtas e claras.
- **Camila Nogueira, supervisora de segurança:** prioriza alertas e trata ocorrências.
- **Roberto Almeida, gestor industrial:** acompanha indicadores e relatórios consolidados.

O protótipo não inclui controle de estoque, compra, distribuição de EPI ou penalidades automáticas, pois esses itens estão fora do escopo da Sprint 1.

## 2. Decisão sobre o fluxo de EPI por colaborador

O enunciado da Sprint 2 exige “cadastro e consulta de EPI por colaborador”. Na modelagem da Sprint 1:

- `RF02` prevê o cadastro do operador com matrícula, setor e turno;
- `RF03` e `RN01` definem EPIs obrigatórios por zona;
- `RF04–RF06` validam os EPIs detectados em um evento associado ao operador;
- o diagrama de classes relaciona `EventoMonitoramento` ao `Operador` e suas `DeteccaoEPI`.

Assim, o fluxo será representado como **cadastro do colaborador e consulta de sua conformidade de EPI por zona**, sem inventar entrega ou estoque de equipamentos.

## 3. Estrutura recomendada no Figma

1. `00 — Capa e instruções`
2. `01 — Fundamentos visuais`
3. `02 — Componentes`
4. `03 — Mapa de telas`
5. `04 — Protótipo navegável`
6. `05 — Documentação e rastreabilidade`

Usar frames principais de tablet em `1280 × 800 px`, grade de 8 px e alvos clicáveis de pelo menos `48 × 48 px`.

## 4. Mapa de telas

| ID | Tela | Persona principal | Objetivo | Rastreabilidade |
|---|---|---|---|---|
| D01 | Dashboard de segurança | Camila / Roberto | Priorizar riscos e visualizar conformidade | `UC09`, `RF12` |
| M01 | Monitoramento ao vivo | Camila | Acompanhar zonas, dispositivos e eventos | `UC03`, `UC04`, `RF04–RF06`, `RF16` |
| O01 | Operadores e EPIs | Camila | Localizar e cadastrar operadores | `RF02` |
| O02 | Cadastro de operador | Camila | Registrar matrícula, setor, turno e status | `RF02` |
| O03 | Perfil e conformidade do operador | Camila | Consultar EPIs exigidos/detectados por zona | `UC03`, `UC04`, `RF06`, `RF10` |
| A01 | Central de alertas | Camila | Visualizar e priorizar alertas ativos | `UC05`, `UC07`, `RF07`, `RF08` |
| A02 | Alerta preventivo do operador | João | Entender e corrigir o risco | `UC06`, `RF09`, `RN05` |
| A03 | Detalhe da ocorrência | Camila | Validar, comentar, encerrar ou escalar | `UC08`, `RF10`, `RF11`, `RN04` |
| Z01 | Zonas e regras | Camila | Consultar zonas, EPIs e limiares | `UC11`, `RF03`, `RF14`, `RN01` |
| Z02 | Configuração de zona | Camila | Ajustar matriz de EPIs e severidade | `UC11`, `RF03`, `RF14` |
| R01 | Relatórios de conformidade | Roberto | Filtrar indicadores por setor e período | `UC10`, `RF12`, `RF13`, `RN08` |
| R02 | Resultado do relatório | Roberto | Analisar e exportar dados consolidados | `UC10`, `RF13` |

## 5. Fluxos principais

### Fluxo 1 — Cadastro e consulta de EPI por colaborador

`D01 → O01 → O02 → O01 → O03`

1. Camila acessa **Operadores & EPIs**.
2. Cadastra um operador informando nome, matrícula, setor e turno.
3. Localiza o operador cadastrado.
4. Abre o perfil para consultar a zona atual, os EPIs obrigatórios, as detecções e o histórico recente.

Correspondência: `RF02`, `UC03`, `UC04`, `RF06`, `RF10`, `EventoMonitoramento`, `DeteccaoEPI` e `TipoEPI`.

### Fluxo 2 — Emissão e visualização de alerta de risco

`M01 → A02 → A01 → A03`

1. Um evento de campo é capturado por câmera/sensor.
2. O motor de regras identifica EPI ausente e emite o alerta automaticamente.
3. João recebe orientação preventiva e corrige o EPI ou sai da área.
4. Camila visualiza o alerta, valida a situação e encerra ou escala a ocorrência.
5. O sistema atualiza histórico e indicadores.

Correspondência: `UC03–UC08`, `RF04–RF11`, `RN02–RN07` e diagrama de atividades.

### Fluxo 3 — Relatório de conformidade por setor

`D01 → R01 → R02`

1. Roberto acessa **Relatórios**.
2. Seleciona setor, turno e período.
3. Gera uma visão consolidada com taxa de conformidade, eventos e tendências.
4. Simula a exportação em PDF/CSV.

Correspondência: `UC09`, `UC10`, `RF12`, `RF13`, `RN08` e `RelatorioConformidade`.

### Fluxo complementar — Configuração de zonas e regras

`D01 → Z01 → Z02 → Z01`

Camila consulta e ajusta a matriz de EPIs obrigatórios, a severidade e o limiar de confiança de uma zona.

Correspondência: `UC11`, `RF03`, `RF14`, `RN01`, `RS03`, `ZonaOperacional` e `RequisitoEPI`.

## 6. Conteúdo das telas

### Dashboard

- Indicadores: conformidade geral, alertas ativos, ocorrências críticas e saúde dos dispositivos.
- Atenção imediata: alertas ordenados por severidade e tempo.
- Conformidade por área: Produção, Montagem, Logística e Zona de Teste.
- Ações rápidas: monitoramento, operadores, zonas e relatórios.

### Perfil do operador

- Nome, matrícula, setor, turno e status.
- Zona atual e requisitos aplicáveis.
- Lista comparativa: EPI obrigatório, detectado, confiança e status.
- Histórico de eventos e ocorrências, sem linguagem punitiva.

### Detalhe da ocorrência

- Zona, horário, severidade, mensagem, evidência minimizada e EPI ausente.
- Linha do tempo desde a detecção até a ação do supervisor.
- Classificação, comentário e decisão: encerrar ou escalar.
- Registro de auditoria após a decisão.

### Relatório

- Filtros por setor, turno e período.
- Taxa de conformidade e evolução.
- Distribuição por tipo de EPI e zona.
- Alertas por severidade e ocorrências tratadas.
- Exportação simulada em PDF/CSV.

## 7. Sistema visual

| Uso | Cor |
|---|---|
| Fundo principal | `#F3F6F8` |
| Superfície | `#FFFFFF` |
| Texto principal | `#17212B` |
| Texto secundário | `#5B6875` |
| Azul de ação | `#175CD3` |
| Azul escuro da marca | `#102A43` |
| Crítico | `#C43232` |
| Atenção | `#D97706` |
| Conforme | `#238636` |
| Bordas | `#D9E1E8` |

- Fonte: Inter, Roboto ou Arial.
- Título de tela: 28 px, peso 700.
- Corpo: 15–16 px.
- Botões e campos: altura mínima de 48 px.
- Status sempre comunicado por cor, rótulo e ícone/símbolo.
- Textos objetivos para leitura rápida e uso com luvas.

## 8. Decisões de UX

1. **Risco antes de métricas:** Camila precisa identificar rapidamente o que exige ação.
2. **Alerta preventivo, não punitivo:** a mensagem orienta João sobre a correção necessária.
3. **Evidência minimizada:** o protótipo mostra apenas informação necessária para auditoria, conforme `RNF05`, `RNF06` e `RS07`.
4. **Ação humana obrigatória:** nenhuma penalidade ou parada de máquina é automática, conforme `RN06` e `RS06`.
5. **Leitura industrial:** alto contraste, mensagens curtas e botões grandes atendem `RNF08`.
6. **Estado dos dispositivos visível:** falhas técnicas não são confundidas com comportamento do operador, conforme `RF16` e `RN07`.
7. **Indicadores consolidados:** relatórios evitam exposição desnecessária de dados pessoais, conforme `RN08`.

## 9. Matriz de rastreabilidade

| Tela/fluxo | Caso de uso | Requisitos e regras | Classes |
|---|---|---|---|
| D01 Dashboard | `UC09` | `RF12`, `RN08` | `RelatorioConformidade`, `EventoMonitoramento` |
| M01 Monitoramento | `UC03`, `UC04` | `RF04–RF06`, `RF16`, `RNF01`, `RN07` | `DispositivoMonitoramento`, `EventoMonitoramento`, `DeteccaoEPI`, `MotorRegrasEPI` |
| O01/O02 Operadores | apoio a `UC03` | `RF02` | `Operador` |
| O03 Conformidade do operador | `UC03`, `UC04` | `RF06`, `RF10` | `Operador`, `EventoMonitoramento`, `DeteccaoEPI`, `TipoEPI` |
| A02 Alerta do operador | `UC05`, `UC06` | `RF07`, `RF09`, `RN05` | `AlertaRisco`, `ServicoNotificacao` |
| A01/A03 Alertas e ocorrência | `UC07`, `UC08` | `RF08`, `RF10`, `RF11`, `RN04`, `RNF07` | `AlertaRisco`, `OcorrenciaSeguranca`, `Supervisor` |
| Z01/Z02 Zonas e regras | `UC11` | `RF03`, `RF14`, `RN01`, `RS03` | `ZonaOperacional`, `RequisitoEPI`, `TipoEPI` |
| R01/R02 Relatórios | `UC09`, `UC10` | `RF12`, `RF13`, `RN08` | `Gestor`, `RelatorioConformidade` |

## 10. Checklist final

- [ ] Os três fluxos mínimos funcionam de ponta a ponta.
- [ ] O protótipo inicia no dashboard.
- [ ] Toda tela possui retorno e navegação lateral funcionais.
- [ ] O alerta é emitido automaticamente a partir de um evento de risco.
- [ ] O tratamento de ocorrência permite encerrar ou escalar.
- [ ] Nenhuma tela sugere estoque, punição automática ou reconhecimento facial.
- [ ] A documentação explica a interpretação do fluxo de EPI por colaborador.
- [ ] O link do protótipo abre sem solicitar edição.
- [ ] O vídeo possui até 3 minutos e está público ou não listado.
- [ ] O README e o arquivo final de entrega possuem os links atualizados.
