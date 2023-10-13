import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Cache } from './cache';
import { Config } from './config';

const cache = new Cache();

function matchingStartCount(a: string, b: string) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    let count;
    for(count = 0; count < a.length && count < b.length; ++count) {
        if(a[count] != b[count]) {
            break;
        }
    }
    return count;
}

async function openFile(path: string): Promise<void> {
	const uri = vscode.Uri.file(path);
	const document = await vscode.workspace.openTextDocument(uri);
	await vscode.window.showTextDocument(document);
}

async function readdirRecursive(dir: string): Promise<string[]> {
    const files = await fs.promises.readdir(dir);
    const subdirs = await Promise.all(
      files.map(async (file) => {
        const filePath = dir + '/' + file;
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
          return await readdirRecursive(filePath);
        }
        return [];
      })
    );
    const fullPathFiles = files.map(file => path.join(dir, file));
    return fullPathFiles.concat(...subdirs);
}

async function findSwapFile(fileInfo: path.ParsedPath): Promise<string | undefined> {

	// Get extension configuration
    const headerExts = Config.getHeaderExtensions();
    const sourceExts = Config.getSourceExtensions();

	// If the current file extension matches the header extensions, then we want to look for a source extension
	// Otherwise, we'll just assume this is a source file and search for a header extension
	const searchExts = headerExts.indexOf(fileInfo.ext) >= 0 ? 
						sourceExts :
						headerExts;

	let result;

	// First look for a matching file in the directory of the current file
	const dirFiles = await fs.promises.readdir(fileInfo.dir);
	result = dirFiles.find((dirFile: string) => {
		const dirFileInfo = path.parse(dirFile);
		return dirFileInfo.name == fileInfo.name         // Does the file name match?
		    && searchExts.indexOf(dirFileInfo.ext) >= 0; // Does the extension match one of the extensions we are looking for?
	});

	// If we found something, then we are done
	if(result) {
		result = path.join(fileInfo.dir, result); // Return the full path
		return result;
	}

    // Search in common parent folder of "include" and "src"
    let dirs = fileInfo.dir.split(path.sep);
    let commonParentIndex = [dirs.indexOf("include"), dirs.indexOf("src")].find(i => i !== -1);
    if(commonParentIndex !== undefined) {
        let commonParent = dirs.slice(0, commonParentIndex).join(path.sep);
        const dirFiles = await readdirRecursive(commonParent);
        result = dirFiles.find((dirFile: string) => {
            const dirFileInfo = path.parse(dirFile);
            return dirFileInfo.name === fileInfo.name        // Does the file name match?
                && searchExts.indexOf(dirFileInfo.ext) >= 0; // Does the extension match one of the extensions we are looking for?
        });

        // If we found something, then we are done
        if(result) {
            return result;
        }
    }

	// There was no match in the current directory, so lets look in the workspace next

	// Since this can take some time in a larger project, show a progress message that the user can cancel
	const searchCancel = new vscode.CancellationTokenSource();
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Searching for swap file...",
		cancellable: true
	},
	async(progress, token) => {
		token.onCancellationRequested(() => {
			searchCancel.cancel();
		});
		return new Promise<void>((resolve) => {
			searchCancel.token.onCancellationRequested(() => {
				resolve();
			});
		});
	});

	// Search for any candidate swap files in the workspace
	let candidateFiles = await vscode.workspace.findFiles(`**/${fileInfo.name}.*`, undefined, undefined, searchCancel.token);

	// Narrow down candidates to valid possibilities
	candidateFiles = candidateFiles.filter((fileuri: vscode.Uri) => {
		const fileuriInfo = path.parse(fileuri.path);
		return fileuriInfo.name == fileInfo.name		 // Does the file name match?
			&& searchExts.indexOf(fileuriInfo.ext) >= 0; // Does the extension match one of the extensions we are looking for?
	});

	// Close the progress message
	searchCancel.cancel();
	searchCancel.dispose();

	// If we didn't find any candidate files, then we are done and there is nothing more we can do
	if(candidateFiles.length <= 0) {
		return undefined;
	}

	// If we found exactly one match, then that's what we'll use
	if(candidateFiles.length == 1) {
		result = candidateFiles[0].path.substring(1); // Uri path variable has a leading '/' that we need to remove
		return result;
	} 

	// Otherwise, there are multiple candidates. Let the user decide which one they want
	const options = candidateFiles.map((item) => {
		return {
			label: path.basename(item.path),
			description: path.normalize(item.path.substring(1)) // Uri path variable has a leading '/' that we need to remove
		}
	});

    // Sort in such a way that the candidates with a longer matching directory with the input file bubble to the top
    options.sort((a, b) => {
        const aCount = matchingStartCount(fileInfo.dir, a.description);
        const bCount = matchingStartCount(fileInfo.dir, b.description);
        if(aCount > bCount) {
            return -1;
        }
        if(aCount < bCount) {
            return 1;
        }
        return 0;
    });

    const pickedFile = await vscode.window.showQuickPick(options, {
		placeHolder: "Choose swap file"
	});

	// User cancelled the selection process
	if(!pickedFile) {
		return undefined;
	}

	// Return the user's selection
	result = pickedFile.description;
	return result;
}

export async function swap(): Promise<void> {
	
	// If no active text editor, then nothing to do
	if(!vscode.window.activeTextEditor) {
		return;
	}

	// Get the currently opened file path
	const currentFile = vscode.window.activeTextEditor.document.fileName;

	// Check if we already have a cached result
	const cachedResult = cache.get(currentFile);
	if(cachedResult) {
		try {
			return await openFile(cachedResult);
		} catch(error) {
			// If we failed to open for whatever reason (maybe the file was deleted or renamed?) remove cache entry
			cache.remove(currentFile);
		}
	}

	// Get current file info
	const currentFileInfo = path.parse(currentFile);

	// If the current file has no extension, then there is nothing we can swap to
	if(!currentFileInfo.ext) {
		return;
	}

	// Attempt to find a file to swap to
	const swapFile = await findSwapFile(currentFileInfo);

	// Couldn't find a swap candidate? Then nothing to do
	if(!swapFile) {
		return;
	}

	// Try to open the file in the editor
    try {
        await openFile(swapFile);

		// We succeeed, so cache the result
		cache.add(currentFile, swapFile);
    }
    catch(error) {
		vscode.window.showErrorMessage(`Failed to open ${swapFile}: ${error}`);
    }	
}
