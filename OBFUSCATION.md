# JavaScript Obfuscation

Este projeto utiliza o `javascript-obfuscator` para proteger o código-fonte em produção.

## 🔒 O que é Obfuscation?

Obfuscation (ofuscação) é o processo de transformar código JavaScript legível em código funcionalmente equivalente, mas extremamente difícil de entender e fazer engenharia reversa.

## ⚙️ Configuração

### Arquivos de Configuração

1. **`obfuscator.config.js`** - Configurações do obfuscator
2. **`vite.config.ts`** - Integração com o build process

### Como Funciona

O obfuscator **só é aplicado em builds de produção**. Durante o desenvolvimento (`pnpm dev`), o código permanece normal para facilitar debugging.

## 🚀 Comandos

### Desenvolvimento (sem obfuscation)
```bash
pnpm dev
```

### Build de Produção (com obfuscation)
```bash
pnpm build:prod
# ou
NODE_ENV=production pnpm build
```

### Build Normal (sem obfuscation)
```bash
pnpm build
```

## 🛡️ Proteções Aplicadas

### 1. String Array Encoding
Todas as strings são convertidas para arrays encodados em base64:
```js
// Antes
const message = "Hello World";

// Depois
const _0x1a2b = ['SGVsbG8gV29ybGQ='];
const message = atob(_0x1a2b[0]);
```

### 2. Control Flow Flattening
O fluxo de controle é transformado em uma estrutura switch-case complexa:
```js
// Antes
if (condition) {
  doSomething();
} else {
  doOtherThing();
}

// Depois
var _0x4f3a = '0|1|2'.split('|'), _0x1b2c = 0;
while (!![]) {
  switch (_0x4f3a[_0x1b2c++]) {
    case '0':
      // código ofuscado
      continue;
    case '1':
      // código ofuscado
      continue;
  }
  break;
}
```

### 3. Dead Code Injection
Código falso (que nunca executa) é injetado para confundir:
```js
// Código real misturado com código morto
if (false) {
  console.log("Este código nunca executa");
}
actualCode();
```

### 4. Identifier Renaming
Variáveis e funções são renomeadas para hexadecimal:
```js
// Antes
function calculateTotal(price, quantity) {
  return price * quantity;
}

// Depois
function _0x3f4a(_0x1b2c, _0x4d3e) {
  return _0x1b2c * _0x4d3e;
}
```

### 5. Self Defending
O código se auto-protege contra beautification/formatting:
```js
// Se alguém tentar formatar o código, ele para de funcionar
```

### 6. Console Output Disable
Remove todos os `console.log` em produção:
```js
// console.log é removido automaticamente
```

## 🎯 Proteções Principais

| Proteção | Descrição | Nível |
|----------|-----------|-------|
| **String Encoding** | Strings em base64 | Alto |
| **Control Flow** | Lógica embaralhada | Médio-Alto |
| **Dead Code** | Código falso injetado | Médio |
| **Identifier Rename** | Variáveis renomeadas | Alto |
| **Self Defending** | Anti-beautification | Alto |
| **Terser Minify** | Compressão adicional | Médio |

## ⚠️ Importante

### Performance
- O código ofuscado é **mais pesado** (~30-40% maior)
- É **mais lento** para executar (~10-20% mais lento)
- Compensa a proteção adicional contra roubo de código

### Debug em Produção
- **DevTools continua funcionando** (debugProtection: false)
- Source maps **não são gerados** em produção
- Para debug, use `pnpm build` sem NODE_ENV=production

### Arquivos Excluídos
Os seguintes arquivos **NÃO são ofuscados**:
- `node_modules/**`
- `service-worker.js`
- `sw.js`
- `workbox-*.js`
- `*.d.ts`

## 🔧 Ajustando Configurações

Para ajustar o nível de obfuscation, edite `obfuscator.config.js`:

### Para mais performance (menos proteção)
```js
export default {
  compact: true,
  controlFlowFlattening: false,  // Desabilitar
  deadCodeInjection: false,      // Desabilitar
  stringArrayEncoding: ['none'],  // Sem encoding
  selfDefending: false,          // Desabilitar
};
```

### Para mais proteção (menos performance)
```js
export default {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,  // 100%
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 1,      // 100%
  stringArrayEncoding: ['rc4'],       // Encoding mais forte
  selfDefending: true,
  debugProtection: true,              // Ativar proteção debug
};
```

## 📊 Análise de Build

Após o build, você pode verificar:

```bash
# Ver tamanho dos arquivos
ls -lh build/_app/immutable/chunks/

# Abrir arquivo ofuscado para verificar
cat build/_app/immutable/chunks/[chunk-name].js
```

## 🐛 Troubleshooting

### Build falha com erro de obfuscation
- Verifique se há sintaxe inválida no código
- Tente reduzir `controlFlowFlatteningThreshold`
- Adicione arquivos problemáticos ao `exclude`

### Código não funciona após obfuscation
- Verifique se há uso de `eval()` ou `Function()`
- Desative `renameGlobals` se usar variáveis globais
- Não use `renameProperties` com objetos externos

### Build muito lento
- Reduza thresholds (0.75 → 0.5)
- Desative `deadCodeInjection`
- Use menos encoding: `['base64']` → `['none']`

## 📚 Documentação

- [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator)
- [Opções de configuração](https://github.com/javascript-obfuscator/javascript-obfuscator#options)
- [vite-plugin-javascript-obfuscator](https://github.com/elmeet/vite-plugin-javascript-obfuscator)

## ✅ Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Rodar `pnpm build:prod`
- [ ] Verificar se build completou sem erros
- [ ] Testar a aplicação no `pnpm preview`
- [ ] Verificar se todas funcionalidades estão operando
- [ ] Verificar tamanho dos chunks (não deve crescer muito)
- [ ] Abrir DevTools e verificar se código está ofuscado
- [ ] Fazer deploy! 🚀
