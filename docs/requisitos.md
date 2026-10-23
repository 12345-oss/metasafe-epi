# Levantamento de Requisitos - MetaSafe EPI

## 1. Contexto

O MetaSafe EPI foi modelado para o contexto de uma planta industrial conectada ao conceito de Metaindustria: uso de tecnologias 4.0, integracao TI/TO, IA, sensores, dados operacionais e validacao de solucoes em problemas reais de producao.

A dor central e a seguranca industrial reativa. Em vez de esperar uma auditoria ou uma ocorrencia para agir, o sistema acompanha condicoes de risco em tempo real e orienta operador e supervisor antes que a situacao se agrave.

## 2. Fontes de levantamento

| Codigo | Fonte | Como foi usada |
| --- | --- | --- |
| F01 | Enunciado da Sprint 1 do Challenge 2026 FIAP x SPI Integracao | Definicao do problema, entregaveis, atores e foco em seguranca proativa. |
| F02 | Referencias publicas sobre Metaindustria, ABDI e SPI | Contexto de IA industrial, tecnologias 4.0, PoCs, laboratorios e integracao com processos produtivos. |
| F03 | Entrevista ficticia com operador de chao de fabrica | Necessidades de alertas simples, rapidos e sem linguagem punitiva. |
| F04 | Entrevista ficticia com supervisora de seguranca | Necessidades de priorizacao, historico de ocorrencias e configuracao de regras. |
| F05 | Entrevista ficticia com gestor industrial | Necessidades de indicadores, relatorios e visao por turno, linha e setor. |

## 3. Personas

### Persona 1 - Joao Santos, operador de producao

- Idade: 34 anos.
- Rotina: atua em linha de montagem com circulacao entre areas de movimentacao, bancada e zona de teste.
- Dores: nao quer ser interrompido por alerta falso; precisa entender rapidamente o que corrigir; usa luvas e protetor auricular conforme a area.
- Objetivo: receber orientacao clara antes de entrar em uma area sem EPI correto.
- Fala da entrevista ficticia: "Se o aviso for direto e aparecer na hora, eu corrijo. O problema e descobrir depois que estava errado."

### Persona 2 - Camila Nogueira, supervisora de seguranca

- Idade: 41 anos.
- Rotina: acompanha varias linhas por turno, faz rondas, registra ocorrencias e conduz DDS.
- Dores: dificuldade de saber quais riscos estao acontecendo agora; registros manuais incompletos; pouca visibilidade de reincidencia.
- Objetivo: priorizar alertas por severidade e tratar a causa antes de abrir uma medida formal.
- Fala da entrevista ficticia: "Eu preciso separar esquecimento pontual de padrao recorrente. Sem historico, tudo vira achismo."

### Persona 3 - Roberto Almeida, gestor industrial

- Idade: 47 anos.
- Rotina: analisa produtividade, qualidade, seguranca e custo operacional da planta.
- Dores: indicadores de seguranca chegam tarde; dificil comparar areas e turnos; iniciativas de prevencao nao mostram resultado com facilidade.
- Objetivo: acompanhar conformidade por area produtiva e decidir onde investir em treinamento, sinalizacao ou mudanca de processo.
- Fala da entrevista ficticia: "Seguranca tambem precisa de dado confiavel. Nao para punir mais, mas para prevenir melhor."

## 4. Escopo da aplicacao

### Dentro do escopo

- Cadastro de usuarios por perfil.
- Cadastro de zonas operacionais.
- Cadastro de EPIs obrigatorios por zona/atividade.
- Recebimento de eventos de cameras e sensores.
- Validacao automatica de conformidade de EPI.
- Emissao de alertas preventivos.
- Tratamento de ocorrencias pelo supervisor.
- Dashboard e relatorios gerenciais.
- Historico auditavel de eventos.

### Fora do escopo

- Folha de pagamento, advertencias automaticas ou gestao de RH.
- Compra, estoque e distribuicao completa de EPIs.
- Reconhecimento facial como identificacao principal.
- Controle autonomo de parada de maquina.
- Substituicao dos procedimentos legais e internos de seguranca.

## 5. Requisitos funcionais

| ID | Requisito funcional | Prioridade | Fonte |
| --- | --- | --- | --- |
| RF01 | O sistema deve autenticar usuarios e liberar funcionalidades conforme perfil: operador, supervisor ou gestor. | Essencial | F01, F04 |
| RF02 | O sistema deve permitir o cadastro de operadores, matricula/cracha, setor, turno e status operacional. | Essencial | F03, F04 |
| RF03 | O sistema deve permitir o cadastro de zonas operacionais com nome, tipo de risco, nivel de severidade e EPIs obrigatorios. | Essencial | F01, F04 |
| RF04 | O sistema deve receber eventos de cameras e sensores IoT associados a uma zona operacional. | Essencial | F01, F02 |
| RF05 | O sistema deve identificar, por visao computacional, se os EPIs esperados estao presentes no evento capturado. | Essencial | F01, F02 |
| RF06 | O sistema deve comparar as deteccoes com a matriz de EPIs obrigatorios da zona. | Essencial | F03, F04 |
| RF07 | O sistema deve emitir alerta preventivo quando houver ausencia de EPI obrigatorio ou permanencia em zona de risco sem conformidade. | Essencial | F01, F03 |
| RF08 | O sistema deve notificar o supervisor quando o alerta tiver severidade media ou critica. | Essencial | F04 |
| RF09 | O sistema deve orientar o operador sobre qual EPI esta ausente ou qual acao preventiva deve ser tomada. | Importante | F03 |
| RF10 | O sistema deve registrar ocorrencia com data, hora, zona, evidencias, severidade, status e responsavel pelo tratamento. | Essencial | F04, F05 |
| RF11 | O supervisor deve poder classificar, comentar, encerrar ou escalar uma ocorrencia. | Essencial | F04 |
| RF12 | O gestor deve visualizar dashboard de conformidade por area, linha, turno, tipo de EPI e periodo. | Essencial | F05 |
| RF13 | O sistema deve gerar relatorio de conformidade em PDF ou CSV. | Importante | F05 |
| RF14 | O sistema deve permitir configuracao de limiares de confianca para deteccao de EPIs e severidade de alertas. | Importante | F04 |
| RF15 | O sistema deve exportar eventos consolidados para sistemas externos, como ERP/MES, por API ou arquivo estruturado. | Desejavel | F02, F05 |
| RF16 | O sistema deve registrar falhas de camera, perda de sinal ou indisponibilidade de sensor. | Importante | F04 |

## 6. Requisitos nao funcionais

| ID | Requisito nao funcional | Prioridade | Fonte |
| --- | --- | --- | --- |
| RNF01 | Alertas criticos devem ser exibidos em ate 5 segundos apos a deteccao do risco em campo. | Essencial | F01, F03 |
| RNF02 | O processamento de visao computacional deve ocorrer preferencialmente no edge, reduzindo dependencia de conexao externa. | Essencial | F02, F04 |
| RNF03 | O sistema deve manter disponibilidade minima de 99,5% durante os turnos de operacao monitorados. | Importante | F05 |
| RNF04 | O sistema deve funcionar em modo degradado por pelo menos 30 minutos quando houver perda temporaria de conexao com o servidor central. | Importante | F04 |
| RNF05 | Dados pessoais devem seguir principios da LGPD: finalidade, minimizacao, controle de acesso e retencao limitada. | Essencial | F04, F05 |
| RNF06 | O sistema nao deve usar reconhecimento facial no MVP; a identificacao deve priorizar cracha, zona, turno ou evento operacional. | Essencial | F03, F05 |
| RNF07 | Todas as ocorrencias e alteracoes de regra devem gerar log de auditoria com data, usuario e acao executada. | Essencial | F04 |
| RNF08 | A interface deve ser simples para uso em ambiente industrial, com mensagens curtas, contraste adequado e leitura rapida. | Importante | F03 |
| RNF09 | A solucao deve ser escalavel para multiplas linhas, turnos e plantas industriais com ajustes de configuracao. | Importante | F02, F05 |
| RNF10 | A arquitetura deve permitir integracao por protocolos e APIs comuns, como REST, MQTT e exportacao CSV. | Importante | F02 |
| RNF11 | O sistema deve monitorar saude de cameras, sensores, broker MQTT, API e banco de dados. | Importante | F04, F05 |
| RNF12 | Backups do banco de dados devem ser automatizados e testados periodicamente. | Importante | F05 |

## 7. Regras de negocio

| ID | Regra |
| --- | --- |
| RN01 | Cada zona operacional deve possuir uma matriz de EPIs obrigatorios. |
| RN02 | Um alerta so deve ser criado quando a confianca da deteccao ficar acima do limiar configurado ou quando houver confirmacao por sensor/regra complementar. |
| RN03 | Alertas de severidade critica devem notificar o supervisor imediatamente. |
| RN04 | Uma ocorrencia so pode ser encerrada por supervisor ou perfil superior. |
| RN05 | O sistema deve diferenciar orientacao preventiva de nao conformidade recorrente. |
| RN06 | Nenhuma advertencia disciplinar deve ser emitida automaticamente pelo sistema. |
| RN07 | Falha de camera ou sensor deve gerar alerta tecnico, nao alerta comportamental do operador. |
| RN08 | Relatorios devem apresentar indicadores consolidados, evitando exposicao desnecessaria de dados pessoais. |

## 8. Restricoes do sistema

| ID | Restricao |
| --- | --- |
| RS01 | Cameras devem ser instaladas somente em areas operacionais autorizadas, nunca em banheiros, refeitorios ou locais de descanso. |
| RS02 | O desempenho da IA depende de iluminacao, angulo de camera e padronizacao visual minima dos EPIs. |
| RS03 | O MVP depende de uma matriz de EPIs validada pela equipe de seguranca da planta. |
| RS04 | A solucao deve respeitar politicas internas de privacidade, seguranca da informacao e seguranca do trabalho. |
| RS05 | A integracao com ERP/MES na Sprint 1 e apenas conceitual/modelada, nao implementada. |
| RS06 | A parada de maquina, quando aplicavel, depende de validacao humana e regras de automacao fora do escopo inicial. |
| RS07 | O sistema deve armazenar apenas evidencias necessarias para auditoria, evitando gravacao continua sem finalidade definida. |

## 9. Rastreabilidade resumida

| Caso de uso | Requisitos relacionados | Classes principais |
| --- | --- | --- |
| Monitorar uso de EPI | RF04, RF05, RF06, RNF01, RNF02 | `DispositivoMonitoramento`, `CameraIP`, `SensorIoT`, `EventoMonitoramento`, `DeteccaoEPI` |
| Emitir alerta de risco | RF07, RF08, RF09, RN03 | `MotorRegrasEPI`, `AlertaRisco`, `ServicoNotificacao` |
| Tratar ocorrencia | RF10, RF11, RN04, RNF07 | `OcorrenciaSeguranca`, `Supervisor`, `HistoricoAuditoria` |
| Gerar relatorio | RF12, RF13, RN08 | `RelatorioConformidade`, `Gestor`, `EventoMonitoramento` |
| Configurar zonas e regras | RF03, RF14, RN01, RS03 | `ZonaOperacional`, `RequisitoEPI`, `TipoEPI` |

