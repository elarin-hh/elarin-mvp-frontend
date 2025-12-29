

export default {
  optionsPreset: 'high-obfuscation',

  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,

  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.6,

  debugProtection: true,
  debugProtectionInterval: 3000,

  disableConsoleOutput: true,

  identifierNamesGenerator: 'mangled-shuffled',
  identifiersPrefix: '',

  log: false,
  sourceMap: false,

  numbersToExpressions: true,

  renameGlobals: false,
  renameProperties: false,

  selfDefending: true,

  simplify: true,

  splitStrings: true,
  splitStringsChunkLength: 6,

  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 1,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexesType: ['hexadecimal-number', 'hexadecimal-numeric-string'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 3,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 6,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1,

  target: 'browser-no-eval',

  transformObjectKeys: true,

  unicodeEscapeSequence: true,
};
