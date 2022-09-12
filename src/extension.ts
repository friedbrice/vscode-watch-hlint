'use strict';
import { Uri, Diagnostic, Range, DiagnosticSeverity, ExtensionContext, DiagnosticCollection, workspace, languages } from 'vscode';
import { dirname } from 'path';
import { readFileSync } from 'fs';

interface Hint {
  severity: 'Ignore' | 'Suggestion' | 'Warning' | 'Error';
  hint: string;
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

function pair<a, b>(a: a, b: b): [a, b] {
  return [a, b];
}

function groupDiagnostic(xs: Array<[Uri, Array<Diagnostic>]>): Array<[Uri, Array<Diagnostic>]> {
  let seen = new Map<string, [number, Uri, Diagnostic[]]>();
  for (var i = 0; i < xs.length; i++) {
    let key = xs[i][0].path;
    let v = seen.get(key);
    if (v) v[2] = v[2].concat(xs[i][1]);
    else seen.set(key, [i, xs[i][0], xs[i][1]]);
  }
  return Array.from(seen.values()).sort((a, b) => a[0] - b[0]).map(x => pair(x[1], x[2]));
}

function parseHlintOutput(dir: string, s: Array<Hint>): Array<[Uri, Array<Diagnostic>]> {
  return s.map(hint => {
    const file = Uri.joinPath(Uri.file(dir), hint.file);
    const range = new Range(hint.startLine - 1, hint.startColumn - 1, hint.endLine - 1, hint.endColumn - 1);
    const message = hint.hint;
    const severity = {
      'Ignore': DiagnosticSeverity.Information,
      'Suggestion': DiagnosticSeverity.Hint,
      'Warning': DiagnosticSeverity.Warning,
      'Error': DiagnosticSeverity.Error
    }[hint.severity];
    const diag = new Diagnostic(range, message, severity);
    return pair(file, [diag]);
  })
}

export async function activate(context: ExtensionContext) {
  const watcher = workspace.createFileSystemWatcher('**/hlint.json');
  context.subscriptions.push(watcher);
  const uri2diags = new Map<string, DiagnosticCollection>();
  context.subscriptions.push({ dispose: () => Array.from(uri2diags.values()).forEach(diag => diag.dispose()) });

  const onUpdate = (uri: Uri) => {
    const diags = uri2diags.get(uri.fsPath) || languages.createDiagnosticCollection();
    uri2diags.set(uri.fsPath, diags);
    diags.clear();
    const dir = dirname(uri.fsPath);
    const content: Array<Hint> = JSON.parse(readFileSync(uri.fsPath, "utf8"));
    const diagnostics = groupDiagnostic(parseHlintOutput(dir, content));
    diags.set(diagnostics);
  }

  (await workspace.findFiles('**/hlint.json')).forEach(onUpdate);
  watcher.onDidCreate(onUpdate);
  watcher.onDidChange(onUpdate);
  watcher.onDidDelete(uri => {
    uri2diags.get(uri.fsPath)?.dispose();
    uri2diags.delete(uri.fsPath);
  })
}

export function deactivate() { }
