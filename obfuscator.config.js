/**
 * Configuração do JavaScript Obfuscator
 *
 * Opções otimizadas para produção com performance e proteção balanceadas
 * Documentação: https://github.com/javascript-obfuscator/javascript-obfuscator
 */

export default {
  // Configurações de compactação
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,

  // Dead code injection (dificulta reverse engineering)
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,

  // Debug protection (dificulta uso do DevTools)
  debugProtection: false, // Desabilitado para não afetar experiência do usuário
  debugProtectionInterval: 0,

  // Desabilitar console.log em produção
  disableConsoleOutput: true,

  // Renomear identificadores
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '',

  // Logging
  log: false,

  // Números para expressões
  numbersToExpressions: true,

  // Rename globals (cuidado com dependências externas)
  renameGlobals: false,

  // Rename properties (pode quebrar código, use com cuidado)
  renameProperties: false,

  // Self defending (código não pode ser formatado/beautified)
  selfDefending: true,

  // Simplify
  simplify: true,

  // Split strings
  splitStrings: true,
  splitStringsChunkLength: 10,

  // String array encoding
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,

  // Target
  target: 'browser',

  // Transform object keys
  transformObjectKeys: true,

  // Unicode escape sequence
  unicodeEscapeSequence: false,
};
