# Manual de uso — MetaSafe EPI

Como usar o sistema com cada uma das três personas definidas na Sprint 1. Para instalar e executar, veja o [README](../README.md#como-executar).

Todos os usuários de demonstração usam a senha **`metasafe123`**. Na tela de login, os botões de **acesso rápido** entram direto com cada persona.

---

## 1. Camila Nogueira — supervisora de segurança

`camila@metaindustria.com.br` · acesso completo

### 1.1 Começar o turno pela Visão geral

1. Depois do login, a **Visão geral** mostra:
   - **Conformidade geral** das últimas 24 h e a variação em relação à semana anterior;
   - **Alertas ativos** e quantos são críticos;
   - **Zonas monitoradas** e **saúde dos dispositivos**;
   - **Atenção imediata**: os alertas pendentes ordenados por severidade.
2. Clique em **Tratar** em qualquer linha para ir direto à ocorrência.

Quando um alerta de severidade média ou crítica é emitido, aparece uma notificação no canto inferior direito, com o botão **Tratar**, em qualquer tela.

### 1.2 Acompanhar o monitoramento ao vivo

1. Menu **Monitoramento**.
2. Cada cartão de zona mostra a conformidade das últimas 24 h (em laranja quando abaixo da meta de 95%), as câmeras e sensores e se há alerta ou falha técnica.
3. **Eventos recentes** é atualizado sozinho a cada leitura das câmeras:
   - verde: entrada validada com todos os EPIs;
   - vermelho: EPI obrigatório ausente;
   - laranja: detecção abaixo do limiar de confiança (sem alerta, regra RN02).
4. **Saúde da solução** mostra câmeras, sensores, API e conexão em tempo real.

### 1.3 Simular eventos para demonstração

Nesta entrega o gateway Edge AI é simulado.

1. Em **Monitoramento**, clique em **Simular evento de risco**.
2. Escolha a **zona**, o **cenário** (ausência de um EPI, sem capacete, sem óculos, vários EPIs, detecção abaixo do limiar ou entrada conforme) e, se quiser, o **crachá** do operador.
3. Clique em **Enviar evento**. O resultado mostra se foi emitido um alerta, a severidade e se o supervisor foi notificado. Em **Payload enviado pelo edge** aparece o JSON que o gateway real enviaria.
4. **Simular falha de dispositivo** coloca uma câmera em modo degradado ou sem sinal e gera um **alerta técnico** (código `TEC-`), sem associar nenhum operador. Na mesma janela, **Restabelecer sinal** volta o dispositivo ao normal.

### 1.4 Tratar uma ocorrência

1. Menu **Central de alertas**. Por padrão aparecem os alertas **pendentes**, ordenados por severidade. Use os filtros de severidade, tipo (EPI ou técnico), status e zona.
2. Clique no alerta. A tela **Tratar ocorrência** mostra:
   - o evento, a zona, a confiança da detecção e há quanto tempo o alerta está aberto;
   - a **evidência anonimizada** (sem imagem do rosto) e a tabela da matriz da zona com o resultado de cada EPI;
   - a **orientação exibida ao operador** e se ele já confirmou no terminal;
   - a **linha do tempo** com todas as ações.
3. Clique em **Assumir tratamento**: o alerta passa para *Em tratamento* com você como responsável.
4. Se precisar, registre um **comentário** na coluna da linha do tempo.
5. Para finalizar:
   - escolha a **Classificação** (esquecimento pontual, risco recorrente, falso positivo, falha técnica ou condição de processo);
   - escolha a **Situação verificada**;
   - descreva a **ação preventiva**;
   - clique em **Encerrar com ação preventiva**.
6. Se o risco **ainda estiver presente**, clique em **Escalar ocorrência**, informe o motivo e confirme. A ocorrência vai para a equipe de segurança com severidade crítica. O sistema não deixa encerrar com "Risco ainda presente".

> O MetaSafe orienta e documenta. Nenhuma advertência disciplinar é gerada automaticamente (RN06).

**Como ler a severidade**

| Situação | Severidade |
| --- | --- |
| Zona de risco médio | Baixa (só orienta o operador) |
| Zona de risco alto ou crítico | Média (notifica o supervisor) |
| Falta capacete, luvas isolantes, máscara de solda ou respirador | sobe um nível |
| Operador com 2 ou mais alertas nos 7 dias anteriores (risco recorrente) | sobe um nível |
| Mesma falha repetida 2 ou mais vezes em 10 minutos | sobe um nível |

### 1.5 Consultar o histórico

1. Menu **Histórico**.
2. Filtre por período, status (encerradas ou escaladas), severidade e zona, ou busque por título ou matrícula.
3. **Exportar CSV** baixa as ocorrências filtradas (com matrícula, sem nome do operador).

### 1.6 Cadastrar e consultar operadores

1. Menu **Operadores & EPIs** → **+ Cadastrar operador**.
2. Informe nome, matrícula/crachá, status operacional, setor e turno e clique em **Cadastrar operador**.
3. Na lista, clique em um operador para ver:
   - a **matriz de EPIs da zona** em que ele foi visto por último, com o que foi detectado e a confiança;
   - a conformidade dos últimos 30 dias;
   - os **alertas e ocorrências** e o **histórico de eventos**.
4. **Editar cadastro** altera os dados; a alteração vai para o log de auditoria.

### 1.7 Configurar zonas e regras

1. Menu **Zonas & regras**. A parte de baixo da tela mostra as últimas alterações auditadas.
2. Clique em uma zona (ou em **+ Nova zona operacional**).
3. Ajuste nome, setor, linha, tipo de risco, **nível de risco** e se o monitoramento está ativo.
4. Na **Matriz de EPIs obrigatórios**:
   - **Adicionar EPI…** inclui um EPI na matriz;
   - a barra de **Confiança mínima** define o limiar daquele EPI (RF14);
   - **Obrigatório** pode ser desmarcado para manter o EPI como opcional;
   - **Remover** tira o EPI da matriz.
5. Clique em **Salvar e registrar auditoria**. A alteração, com o antes e o depois, aparece em **Histórico de auditoria**.

---

## 2. Roberto Almeida — gestor industrial

`roberto@metaindustria.com.br` · painéis, relatórios e ocorrências; regras em modo leitura

### 2.1 Gerar um relatório de conformidade

1. Menu **Relatórios**.
2. Escolha **setor**, **zona**, **turno** e **período** e clique em **Gerar relatório**.
3. O relatório mostra:
   - conformidade geral e variação em relação ao período anterior;
   - eventos analisados, alertas preventivos (recorrentes e técnicos) e percentual de ocorrências tratadas;
   - evolução diária da conformidade com a meta de 95%;
   - alertas por severidade;
   - **EPIs com mais alertas**, principal setor e tendência;
   - conformidade por zona e por turno.
4. **Exportar CSV** baixa os números do relatório. **Exportar PDF** abre a impressão do navegador já formatada — escolha "Salvar como PDF".

Os relatórios não mostram nomes de operadores (RN08).

### 2.2 Acompanhar e tratar ocorrências

O gestor vê a Visão geral, o Monitoramento, a Central de alertas e o Histórico, e pode encerrar ou escalar ocorrências (RN04: "supervisor ou perfil superior"). Em **Zonas & regras**, as configurações aparecem só para leitura.

---

## 3. João Santos — operador de produção

`joao@metaindustria.com.br` · terminal de campo

O terminal fica instalado na entrada da zona. Ao entrar, o operador vê o **Terminal de campo**.

1. No alto, **Zona deste terminal** indica a zona (pode ser trocada para a demonstração).
2. Sem pendências, a tela fica verde e lista os EPIs exigidos para entrar na zona.
3. Quando a câmera detecta a falta de um EPI, a tela mostra o **alerta preventivo**: qual EPI falta e a ação recomendada.
4. **Entendi, vou corrigir** confirma a orientação. A confirmação aparece na linha do tempo da ocorrência que o supervisor está vendo.
5. **Sair da área** apenas fecha o aviso naquele terminal.

---

## 4. Integração com ERP/MES

Sistemas externos podem buscar os eventos consolidados (sem nome do operador):

```
GET /api/integracao/eventos?desde=2026-10-21T00:00:00Z&formato=json
GET /api/integracao/eventos?formato=csv
Authorization: Bearer <token de supervisor ou gestor>
```

A documentação completa da API fica em http://localhost:8000/docs.

## 5. Gateway Edge AI (script)

Para gerar eventos contínuos fora da interface:

```bash
cd edge-simulator
python simulador.py --api http://localhost:8000 --intervalo 3 --risco 0.3
```

Com Docker: `docker compose --profile edge up`.

## 6. Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| "Não foi possível conectar à API" | Verifique se a API está rodando na porta 8000 (`http://localhost:8000/api/health`). |
| Indicador "Reconectando…" no menu | A conexão em tempo real caiu; ela volta sozinha. Se persistir, recarregue a página. |
| Sessão expirada | O login vale por um turno (8 horas). Entre novamente. |
| Quero os dados de demonstração de volta | Sem Docker: `cd backend && python -m app.seed --reset`. Com Docker: `docker compose down -v && docker compose up --build`. |
| Porta 8080, 8000 ou 5173 ocupada | Feche o outro programa ou altere a porta em `docker-compose.yml` / `vite.config.ts`. |
