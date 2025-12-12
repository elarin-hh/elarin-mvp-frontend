

export default {

  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,


  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,


  debugProtection: false,
  debugProtectionInterval: 0,


  disableConsoleOutput: true,


  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '',


  log: false,


  numbersToExpressions: true,


  renameGlobals: false,


  renameProperties: false,


  selfDefending: true,


  simplify: true,


  splitStrings: true,
  splitStringsChunkLength: 10,


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


  target: 'browser',


  transformObjectKeys: true,


  unicodeEscapeSequence: false,
};
