import * as path from 'path';
import { Config } from './config';

export class Cache
{
    cache: Map<string, string>;

    constructor() {
        this.cache = new Map<string, string>();
    }

    add(sourcePath: string, swappedPath: string): void {
        if(Config.isCachingDisabled()) {
            return;
        }

        sourcePath = path.normalize(sourcePath.toLowerCase());
        swappedPath = path.normalize(swappedPath.toLowerCase());
        this.cache.set(sourcePath, swappedPath);
        this.cache.set(swappedPath, sourcePath);
    }

    remove(filepath: string): void {
        filepath = path.normalize(filepath.toLowerCase());
        this.cache.delete(filepath);
    }

    get(filepath: string): string | undefined {
        if(Config.isCachingDisabled()) {
            return undefined;
        }

        filepath = path.normalize(filepath.toLowerCase());
        return this.cache.get(filepath);
    }
}
