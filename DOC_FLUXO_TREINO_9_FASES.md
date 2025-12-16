# Documentação: Fluxo de Treino em 9 Fases

## Visão Geral

Este documento detalha o fluxo completo de experiência do usuário na tela de treino (`/train`), conforme especificado nos requisitos. O objetivo é criar uma jornada estruturada e intuitiva que guie o usuário desde o posicionamento inicial até a conclusão do treino.

---

## Fases do Fluxo

### **Fase 1: Posicionamento Inicial**

**Objetivo:** Garantir que o usuário esteja corretamente posicionado em frente à câmera.

**Descrição:**
- Ao entrar na tela de treino, o sistema deve exibir uma mensagem orientando o usuário a se posicionar.
- Texto sugerido: **"Por favor, se posicione em frente à câmera"**
- A detecção de pose deve estar ativa, mas sem iniciar análise de exercício ainda.

**Comportamento:**
- O sistema monitora continuamente os landmarks da pose (MediaPipe).
- Quando detectar pontos-chave visíveis (nariz, ombros, quadris), transiciona automaticamente para a Fase 2.

**UI Sugerida:**
- Overlay semi-transparente sobre o vídeo.
- Ícone de câmera ou avatar humano centralizado.
- Mensagem clara e grande.

---

### **Fase 2: Confirmação de Posicionamento**

**Objetivo:** Confirmar visualmente ao usuário que ele foi detectado e está na posição correta.

**Descrição:**
- Mensagem de confirmação positiva.
- Texto sugerido: **"Ótimo, esse é o lugar certo."**
- Esta fase deve ser breve (2-3 segundos) para criar fluidez.

**Comportamento:**
- Exibição automática após detecção bem-sucedida.
- Transição automática para a Fase 3 após o tempo definido.

**UI Sugerida:**
- Overlay com ícone de check/confirmação.
- Feedback visual positivo (cor verde, animação de sucesso).

---

### **Fase 3: Iniciação**

**Objetivo:** Preparar o usuário mentalmente para começar.

**Descrição:**
- Mensagem de transição.
- Texto sugerido: **"Vamos iniciar"**

**Comportamento:**
- Breve pausa após confirmação.
- Pode ser uma tela de transição ou combinada com a Fase 4.

**UI Sugerida:**
- Texto centralizado com animação de fade.

---

### **Fase 4: Contexto do Exercício**

**Objetivo:** Informar ao usuário qual exercício será executado e suas metas.

**Descrição:**
- Exibir um card/modal com informações do exercício:
  - **Nome do Exercício** (ex: "Agachamento Livre")
  - **Dados do Exercício:**
    - Número de repetições esperadas
    - Número de séries
    - Duração estimada (se aplicável)
    - Instruções básicas (ex: "Mantenha as costas retas", "Desça até 90 graus")

**Comportamento:**
- O usuário deve ter a opção de iniciar quando estiver pronto.
- Botão de ação: **"Iniciar"** ou **"Começar"**

**UI Sugerida:**
- Card centralizado com design limpo.
- Informações organizadas em seções.
- Botão destacado para iniciar.

---

### **Fase 5: Contagem Regressiva (3 segundos)**

**Objetivo:** Dar tempo para o usuário se preparar fisicamente antes do início da análise.

**Descrição:**
- Contagem regressiva visual de **3 segundos**.
- Exibir: **3 → 2 → 1 → "Vai!"** ou **"Vamos!"**

**Comportamento:**
- Iniciar automaticamente após o usuário clicar em "Iniciar" na Fase 4.
- Pode entrar em fullscreen automaticamente nesta fase.
- Ao fim da contagem, inicia a análise de movimento e cronômetro.

**UI Sugerida:**
- Números grandes e centralizados.
- Animação de pulso/escala para cada número.
- Som opcional (bip ou voz).

---

### **Fase 6: Execução do Exercício (Melhorias no Feedback)**

**Objetivo:** Monitorar e fornecer feedback em tempo real durante a execução.

**Descrição:**
- O usuário executa o exercício.
- O sistema analisa continuamente os movimentos.
- Feedback visual e/ou sonoro é fornecido em tempo real.

**Melhorias Necessárias:**
- **Feedback Visual:** Mensagens claras sobre correções (ex: "Desça mais", "Mantenha o joelho alinhado").
- **Componente de Cronômetro:** Melhorar visibilidade e posicionamento.
- **Contador de Repetições:** Exibir reps completadas vs. meta.
- **Barra de Qualidade:** Indicador visual da qualidade da execução atual.

**Comportamento:**
- Estado ativo de análise.
- Monitoramento contínuo de landmarks.
- Atualização em tempo real de métricas.

**UI Sugerida:**
- Overlay com informações não-intrusivas.
- Feedback de erro destacado quando necessário.
- Indicadores visuais (barras, cores) para qualidade.

---

### **Fase 7: Finalização das Repetições/Exercício**

**Objetivo:** Indicar ao usuário que ele completou a meta de repetições.

**Descrição:**
- Detectar quando o número de repetições válidas foi atingido.
- Mensagem de conclusão.
- Texto sugerido: **"Exercício concluído!"** ou **"Repetições completas!"**

**Comportamento:**
- Pausar análise automaticamente.
- Exibir resumo breve (reps completadas, precisão média).
- Verificar se há mais exercícios no plano de treino.

**UI Sugerida:**
- Overlay de congratulações.
- Métricas de desempenho (precisão, tempo).
- Animação de celebração (confete, estrelas).

---

### **Fase 8: Próximo Exercício (Plano de Treino)**

**Objetivo:** Informar o usuário sobre o próximo exercício no plano.

**Descrição:**
- Se houver mais exercícios:
  - Exibir: **"Próximo exercício: [Nome]"**
  - Permitir descanso ou avançar imediatamente.
- Se não houver mais exercícios, pular para a Fase 9.

**Comportamento:**
- Opções para o usuário:
  - "Continuar" (vai para próximo exercício, volta à Fase 4)
  - "Pausar" (salva progresso e retorna ao dashboard)

**UI Sugerida:**
- Card de transição com preview do próximo exercício.
- Temporizador de descanso opcional.
- Botões de ação claros.

---

### **Fase 9: Finalização do Plano de Treino**

**Objetivo:** Encerrar a sessão de treino e exibir resumo completo.

**Descrição:**
- Tela final com métricas gerais:
  - Total de exercícios completados
  - Total de repetições
  - Tempo total de treino
  - Precisão média geral
  - Recordes pessoais batidos (se aplicável)

**Comportamento:**
- Salvar dados da sessão no backend.
- Opções para o usuário:
  - "Refazer Treino" (reinicia todo o plano)
  - "Voltar ao Dashboard"
  - "Ver Histórico"

**UI Sugerida:**
- Tela de celebração com gráficos/estatísticas.
- Badges ou conquistas desbloqueadas.
- Compartilhamento social (opcional).
- Botões de navegação destacados.

---

## Considerações Técnicas para Implementação

### Máquina de Estados
- Criar um `state` no Svelte para gerenciar a fase atual.
- Tipo sugerido: `'positioning' | 'confirmation' | 'initiation' | 'context' | 'countdown' | 'training' | 'completion' | 'next' | 'summary'`

### Componentes Necessários
1. **PhaseOverlay**: Componente genérico para overlays de fase.
2. **ExerciseContextCard**: Card com informações do exercício.
3. **CountdownTimer**: Contagem regressiva animada.
4. **CompletionSummary**: Tela de resumo com métricas.
5. **NextExercisePreview**: Preview do próximo exercício.

### Fluxo de Navegação
```
Entrada → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7
                                                                    ↓
                                                    Mais exercícios? 
                                                         ↓       ↓
                                                       Sim      Não
                                                         ↓       ↓
                                                    Fase 8   Fase 9
                                                      ↓
                                                   Fase 4 (loop)
```

### Integrações
- **TrainingStore**: Gerenciar estado do treino (status, reps, tempo).
- **ExerciseAnalyzer**: Análise de movimento (já existente).
- **MediaPipe Pose**: Detecção de landmarks (já existente).

---

## Notas Importantes

1. **Contagem Regressiva**: Atualmente é de 5 segundos, deve ser reduzida para **3 segundos**.
2. **Transições**: Devem ser suaves e com animações para melhor UX.
3. **Responsividade**: Todas as fases devem funcionar nos modos de layout (lado-a-lado, user-centered, coach-centered).
4. **Acessibilidade**: Garantir contraste adequado e feedback sonoro como alternativa.
5. **Salvamento**: Salvar progresso automaticamente entre fases para evitar perda de dados.

---

Este documento serve como especificação para implementação futura. Nenhuma alteração de código foi realizada.
