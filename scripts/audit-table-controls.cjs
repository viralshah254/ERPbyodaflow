const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../src');
const records = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.tsx') && !/ [2-9]\.tsx$/.test(file) && !file.endsWith('.test.tsx')) inspect(file);
  }
}
function inspect(file) {
  if (file.includes('/components/ui/')) return;
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tables = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(source);
      if (['Table', 'DataTable', 'InteractiveTable', 'table'].includes(name)) {
        const attrs = node.attributes.getText(source);
        tables.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, component: name,
          search: /searchable=\{false\}/.test(attrs) ? 'page-toolbar' : 'built-in',
          sorting: /sortable=\{false\}/.test(attrs) ? 'statement-controls-or-fixed-summary' : /onSortChange=/.test(attrs) ? 'controlled' : 'shared-column-headers',
          scope: /allData=/.test(attrs) ? 'full-loaded-list-before-pagination' : /dataScope="page"/.test(attrs) ? 'loaded-page-labelled' : 'loaded-list',
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (tables.length) records.push({ file: path.relative(root, file), tables });
}
walk(path.join(root, 'app/(dashboard)'));
walk(path.join(root, 'components'));
const report = { summary: { dashboardPages: records.filter(row => row.file.startsWith('app/')).length, sharedComponents: records.filter(row => row.file.startsWith('components/')).length, tableInstances: records.reduce((total, row) => total + row.tables.length, 0) }, behavior: { editableLineItems: 'Search remains available; automatic row reordering is disabled for inline input forms.', financialStatements: 'Account lines filter/sort within sections. Section totals and original posting balances stay attached to their source records.', pagination: 'Existing server search remains intact. Loaded-page sorting is labelled; client pagination can provide allData for sorting before slicing.' }, files: records };
fs.mkdirSync(path.resolve(__dirname, '../reports'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, '../reports/table-controls-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
