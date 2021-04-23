import replace from 'rollup-plugin-replace';

const {version} = require('./package');

export default [
  'sparql-support.js',
  'sparql.js',
  'sparql-fold.js',
].map((filename) => ({
  input: `src/${filename}`,
  output: {
    file: `js/${filename}`,
    format: 'iife',
    globals: {
      'codemirror/lib/codemirror': 'CodeMirror'
    }
  },
  external: [
    'codemirror/lib/codemirror'
  ],
  plugins: [
    replace({
      __VERSION__: version
    })
  ]
}));
