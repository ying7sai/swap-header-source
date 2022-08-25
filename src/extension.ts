import * as vscode from 'vscode';
import { swap } from './swap';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('swap-header-source.swap', () => {
		swap();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
}
