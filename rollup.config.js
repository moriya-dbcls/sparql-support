import replace from 'rollup-plugin-replace';

const {version} = require('./package');

export default Object.entries({
  'sparql-support.js': null,
  'sparql.js': null
}).map(([filename, moduleName]) => ({
  input: `src/${filename}`,
  output: {
    file: `js/${filename}`,
    format: 'umd',
    name: moduleName,
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
