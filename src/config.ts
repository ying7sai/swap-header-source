import * as vscode from 'vscode';

function getConfig() {
    return vscode.workspace.getConfiguration('swapHeaderSource');
}

export class Config {

    static isCachingDisabled(): boolean {
        let disabled = getConfig().get<Boolean>('disableCaching');
        if(disabled) {
            return true;
        }
        return false;
    }

    static getHeaderExtensions(): string[] {
        const exts = getConfig().get<string[]>('headerExtensions') || [];
        return exts;
    }

    static getSourceExtensions(): string[] {
        const exts = getConfig().get<string[]>('sourceExtensions') || [];
        return exts;
    }
}