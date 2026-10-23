# Diagrama de Casos de Uso

```mermaid
flowchart LR
    Operador([Operador de chao de fabrica])
    Supervisor([Supervisor de seguranca])
    Gestor([Gestor industrial])
    Camera([Camera / Edge AI])
    Sensor([Sensor IoT])
    MES([ERP / MES])

    subgraph Sistema[MetaSafe EPI]
        UC01([Autenticar usuario])
        UC02([Registrar entrada em area operacional])
        UC03([Monitorar uso de EPI])
        UC04([Validar conformidade por zona])
        UC05([Emitir alerta de risco])
        UC06([Orientar operador])
        UC07([Notificar supervisor])
        UC08([Tratar ocorrencia])
        UC09([Consultar dashboard])
        UC10([Gerar relatorio de conformidade])
        UC11([Configurar zonas, EPIs e limiares])
        UC12([Exportar eventos para ERP/MES])
    end

    Operador --> UC01
    Operador --> UC02
    Operador --> UC06
    Supervisor --> UC01
    Supervisor --> UC08
    Supervisor --> UC09
    Supervisor --> UC11
    Gestor --> UC01
    Gestor --> UC09
    Gestor --> UC10
    Camera --> UC03
    Sensor --> UC03
    MES --> UC12

    UC03 -.->|include| UC04
    UC05 -.->|extend: quando houver risco| UC04
    UC05 -.->|include| UC06
    UC05 -.->|include| UC07
    UC08 -.->|include| UC09
    UC10 -.->|include| UC09
    UC12 -.->|extend: quando integracao ativa| UC10
```
