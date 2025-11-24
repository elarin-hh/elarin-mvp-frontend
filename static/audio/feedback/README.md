# Feedback audio assets

Coloque aqui os arquivos `.mp3` gerados no ElevenLabs (ou outro TTS).

Padrão de nome de arquivo esperado pelo `StaticAudioFeedbackProvider`:

- `/audio/feedback/<slug>__<tone>.mp3`
- `slug`: texto do feedback transformado em slug sem acentos (ex.: `Movimento incorreto` → `movimento-incorreto`)
- `tone`: `neutral`, `encouraging`, `motivational` ou `professional`

Exemplo:

- Feedback: `Execução correta!`
- Arquivo: `/audio/feedback/execucao-correta__neutral.mp3`

Caso prefira nomes diferentes, adicione um override no `StaticAudioFeedbackProvider`.
