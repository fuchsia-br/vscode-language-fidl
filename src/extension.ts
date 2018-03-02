'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

function findFidlSource(generatedSourcePath: string): string | void {
    // TODO: establish a non-regex way of finding the source FIDL path.
    const cxx_dart_match = generatedSourcePath.match(/(^.*\/)(?:out\/[^/]+\/gen\/)(.*\.fidl)[\._-][^/]*$/);
    if (cxx_dart_match) {
        return `${cxx_dart_match[1]}${cxx_dart_match[2]}`;
    }

    const go_match = generatedSourcePath.match(/(^.*\/)(?:out\/[^/]+\/gen\/go\/src\/)(.*\/)([^/]+)\/\3\.core\.go$/);
    if (go_match) {
        return `${go_match[1]}${go_match[2]}${go_match[3]}.fidl`;
    }

    const rust_match = generatedSourcePath.match(/(^.*\/)(?:out\/[^/]+\/gen\/)(.*).rs$/);
    if (rust_match) {
        return `${rust_match[1]}/${rust_match[2]}.fidl`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.goToFidlSource', () => {
        if (vscode.window.activeTextEditor) {
            const fileName = vscode.window.activeTextEditor.document.fileName;
            const fidlFileName = findFidlSource(fileName);
            if (fidlFileName && fs.existsSync(fidlFileName)) {
                vscode.workspace.openTextDocument(fidlFileName).then((doc) => vscode.window.showTextDocument(doc));
            } else {
                vscode.window.showErrorMessage(`Couldn't find FIDL source for ${fileName}`);
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}