# Roteiro do vídeo de pitch e demonstração (até 5 minutos)

O enunciado exige **protagonismo dos integrantes** e **não aceita narração por IA**: cada integrante aparece (câmera ou voz própria) na sua parte. As falas abaixo são uma base — adaptem com as palavras de vocês.

**Preparação antes de gravar**

- Subir o sistema com dados novos: `docker compose down -v && docker compose up --build`.
- Deixar abertas duas janelas: uma com a **Camila** (navegador normal) e uma anônima com o **João** no Terminal de campo, zona *Linha de Montagem 02*.
- Zoom do navegador em 110–125% para a tela ficar legível no vídeo.
- Gravar a tela em 1080p; cortar esperas na edição.
- Publicar no YouTube como **Não listado** e colocar o link no README e no `.txt` de entrega.

| Tempo | Quem | Bloco |
| --- | --- | --- |
| 0:00–0:30 | Integrante 1 ✏️ | Abertura e grupo |
| 0:30–1:10 | Integrante 2 ✏️ | Problema na Metaindústria |
| 1:10–1:50 | Integrante 3 ✏️ | Solução e arquitetura |
| 1:50–4:00 | Integrantes 4 e 5 ✏️ | Demonstração do app funcionando |
| 4:00–4:40 | Integrante 1 ✏️ | Evolução nas quatro Sprints e Scrum |
| 4:40–5:00 | Todos | Impacto esperado e encerramento |

---

### 0:00–0:30 · Abertura

> "Olá, somos o grupo do MetaSafe EPI: [cada um diz o nome]. Este é o pitch final do Challenge FIAP com a SPI Integração, no desafio da Metaindústria. Em cinco minutos vamos mostrar o problema, a solução e o produto funcionando."

*Tela: login do MetaSafe.*

### 0:30–1:10 · Problema

> "Hoje a segurança na indústria ainda é reativa. A falta de EPI aparece na auditoria ou depois de um quase acidente. O operador só recebe retorno quando já errou, e a supervisora não sabe quais riscos estão acontecendo agora nem se é um esquecimento pontual ou um padrão. Foi isso que levantamos na Sprint 1 com as personas João, operador, Camila, supervisora de segurança, e Roberto, gestor industrial."

*Tela: slide ou trecho de docs/requisitos.md com as três personas.*

### 1:10–1:50 · Solução e arquitetura

> "O MetaSafe confere, com visão computacional na borda, se quem entra em cada zona está com os EPIs exigidos ali. O vídeo não sai da fábrica: só chega ao servidor um evento com o resultado da detecção, identificado por crachá — sem reconhecimento facial. Uma API em FastAPI aplica as regras da zona, grava no PostgreSQL e manda o alerta em tempo real por WebSocket para a supervisora e para o terminal do operador. O front é em React com TypeScript, e tudo sobe com um único docker compose."

*Tela: diagrama do README (seção Arquitetura).*

### 1:50–4:00 · Demonstração

**Integrante 4 — visão do supervisor (≈ 1 min)**

1. Entrar como Camila. *"Na visão geral, a Camila vê a conformidade das últimas 24 horas, os alertas que precisam de atenção — este aqui é crítico porque o João já teve outros alertas nesta semana — e uma câmera da doca com falha, tratada como alerta técnico, sem culpar ninguém."*
2. Monitoramento → **Simular evento de risco** → Zona de Teste 01 → Sem capacete → Enviar. *"Simulamos a câmera do edge: sem capacete numa zona de risco crítico. O alerta chega na hora — notificação, contador e lista de eventos."*

**Integrante 5 — operador e tratamento (≈ 1 min 10 s)**

3. Janela do João: *"No terminal da Linha de Montagem 02, o João vê qual EPI está faltando e o que fazer. Não é advertência, é orientação."* Clicar **Entendi, vou corrigir**.
4. Voltar à Camila, abrir o alerta do João: *"A confirmação do operador já aparece na linha do tempo."* **Assumir tratamento**, escrever a ação preventiva, **Encerrar com ação preventiva**. *"Tudo fica auditado: quem assumiu, quando e o que foi feito."*
5. (Se houver tempo) Zonas & regras: subir um limiar e salvar. *"Mudança de regra também vai para a auditoria."*

**Integrante 4 — visão do gestor (≈ 20 s)**

6. Relatórios: filtrar por setor ou turno. *"O Roberto vê a conformidade por zona e turno, os EPIs mais esquecidos e exporta em CSV ou PDF, sem nomes de operadores."*

### 4:00–4:40 · Evolução e Scrum

> "Na Sprint 1 levantamos 16 requisitos funcionais, regras de negócio e diagramas UML. Na Sprint 2 viramos isso num protótipo navegável — o produto final usa a mesma identidade visual. Na Sprint 3 evoluímos a central de alertas, o detalhe e o histórico de ocorrências no Figma e organizamos o trabalho no Trello. Na Sprint 4 construímos o produto: os 16 requisitos estão implementados e rastreados no repositório, com 20 testes automatizados. [Mostrar o board do Trello rapidamente.]"

*Tela: README → tabela de entregas por Sprint e o board do Trello.*

### 4:40–5:00 · Impacto e encerramento

> "Para a Metaindústria, o MetaSafe significa corrigir o risco antes do incidente, resposta mais rápida da supervisão e dados para direcionar treinamento por zona e turno. Nos dados simulados, a conformidade sai de cerca de 92% para 96%. O próximo passo é uma prova de conceito com câmera real numa linha da planta. Obrigado!"

---

**Checklist antes de publicar**

- [ ] Duração ≤ 5:00
- [ ] Os cinco integrantes aparecem ou falam
- [ ] Nenhuma narração gerada por IA
- [ ] Aparecem: grupo, problema, solução, app funcionando, impacto
- [ ] Vídeo como **Não listado** no YouTube
- [ ] Link colado no README e no `.txt` de entrega
