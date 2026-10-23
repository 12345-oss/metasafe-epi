# Arquitetura — Sprint 3

## Fluxo refinado

Câmera / Sensor
↓
Edge AI
↓
Detecção de EPI
↓
Evento de monitoramento
↓
FastAPI
↓
Regra de segurança
↓
Alerta de risco
↓
WebSocket
↓
Central de Alertas
↓
Supervisor
↓
Tratamento
↓
PostgreSQL
↓
Histórico / Relatórios

## Refinamento realizado

Na Sprint 3, o fluxo arquitetural foi refinado para representar de forma mais clara o caminho entre a detecção de uma situação de risco e seu tratamento pelo supervisor.

Os eventos identificados pela camada de monitoramento são enviados para a aplicação, que aplica as regras de segurança e gera alertas de risco. Esses alertas são disponibilizados em tempo real na Central de Alertas por meio de WebSocket.

Após a análise do supervisor, o tratamento da ocorrência é registrado no PostgreSQL, permitindo manter o histórico dos eventos e possibilitando consultas e relatórios posteriores.

O refinamento mantém a arquitetura tecnológica definida anteriormente, utilizando React + TypeScript, Python + FastAPI, PostgreSQL, OpenCV/YOLO/ONNX, MQTT, WebSocket, Prometheus/Grafana, Docker e OAuth2/JWT.
