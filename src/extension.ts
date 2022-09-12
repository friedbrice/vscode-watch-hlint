'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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

function groupDiagnostic(xs: Array<[vscode.Uri, Array<vscode.Diagnostic>]>): Array<[vscode.Uri, Array<vscode.Diagnostic>]> {
  let seen = new Map<string, [number, vscode.Uri, vscode.Diagnostic[]]>();
  for (var i = 0; i < xs.length; i++) {
    let key = xs[i][0].path;
    let v = seen.get(key);
    if (v) v[2] = v[2].concat(xs[i][1]);
    else seen.set(key, [i, xs[i][0], xs[i][1]]);
  }
  return Array.from(seen.values()).sort((a, b) => a[0] - b[0]).map(x => pair(x[1], x[2]));
}

function parseHlintOutput(dir: string, s: Array<Hint>): Array<[vscode.Uri, Array<vscode.Diagnostic>]> {
  return s.map(hint => {
    const file = vscode.Uri.file(dir + hint.file);
    const range = new vscode.Range(hint.startLine, hint.startColumn, hint.endLine, hint.endColumn);
    const message = hint.hint;
    const severity = {
      'Ignore': vscode.DiagnosticSeverity.Information,
      'Suggestion': vscode.DiagnosticSeverity.Hint,
      'Warning': vscode.DiagnosticSeverity.Warning,
      'Error': vscode.DiagnosticSeverity.Error
    }[hint.severity];
    const diag = new vscode.Diagnostic(range, message, severity);
    return pair(file, [diag]);
  })
}

export async function activate(context: vscode.ExtensionContext) {
  const watcher = vscode.workspace.createFileSystemWatcher('**/hlint.json');
  context.subscriptions.push(watcher);
  const uri2diags = new Map<string, vscode.DiagnosticCollection>();
  context.subscriptions.push({ dispose: () => Array.from(uri2diags.values()).forEach(diag => diag.dispose()) });

  const onUpdate = (uri: vscode.Uri) => {
    const diags = uri2diags.get(uri.fsPath) || vscode.languages.createDiagnosticCollection();
    uri2diags.set(uri.fsPath, diags);
    diags.clear();
    const dir = path.dirname(uri.fsPath);
    const content: Array<Hint> = JSON.parse(fs.readFileSync(uri.fsPath, "utf8"));
    const diagnostics = groupDiagnostic(parseHlintOutput(dir, content));
    diags.set(diagnostics);
  }

  (await vscode.workspace.findFiles('**/hlint.json')).forEach(onUpdate);
  watcher.onDidCreate(onUpdate);
  watcher.onDidChange(onUpdate);
  watcher.onDidDelete(uri => {
    uri2diags.get(uri.fsPath)?.dispose();
    uri2diags.delete(uri.fsPath);
  })
}

export function deactivate() { }
