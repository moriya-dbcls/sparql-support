export default Object.entries({
  'sparql-support.js': null,
  'sparql.js': null,
  'sparqlSupport.user.js': null,
  'sparqlSupportStart.js': null,
  'sparqlist-support.js': 'SPARQListSupport'
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
  external: ['codemirror/lib/codemirror']
}));
