'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import { findFidlSource } from './findFidlSource';

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