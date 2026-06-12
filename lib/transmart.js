"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transmart = void 0;
const fs = require("fs-extra");
const path = require("path");
const task_1 = require("./task");
const glob_1 = require("glob");
const util_1 = require("./util");
const node_fs_1 = require("node:fs");
const DEFAULT_PARAMS = {
    openAIApiUrl: 'https://api.openai.com',
    openAIApiUrlPath: '/v1/chat/completions',
    openAIApiModel: 'gpt-3.5-turbo',
    modelContextLimit: 4096,
    modelContextSplit: 1 / 1,
    vuei18n: false,
};
class Transmart {
    options;
    constructor(options) {
        this.options = options;
    }
    async run(options) {
        this.validateParams();
        const { baseLocale, locales, localePath, cacheEnabled = true, namespaceGlob = '**/*.json' } = this.options;
        const isFlatLocaleMode = this.isFlatLocaleMode();
        const targetLocales = locales.filter((item) => item !== baseLocale);
        const runworks = [];
        const baseLocaleFullPath = this.getBaseLocaleFullPath();
        const namespaces = isFlatLocaleMode
            ? ['app']
            : await (0, glob_1.glob)(namespaceGlob, {
                cwd: baseLocaleFullPath,
            });
        // if cachePath is not provided, use the localePath/.cache as default
        const cachePath = this.options.cachePath || path.resolve(localePath, '.cache');
        const realNamespaces = namespaces;
        targetLocales.forEach((targetLocale) => {
            realNamespaces.forEach((ns) => {
                const inputNSFilePath = this.getInputNSFilePath(ns);
                const outputNSFilePath = this.getOutputNSFilePath(targetLocale, ns);
                if (cacheEnabled) {
                    const pairHash = (0, util_1.getPairHash)(inputNSFilePath, outputNSFilePath);
                    const targetCachePath = path.join(cachePath, pairHash);
                    // check if the cache file exists
                    if ((0, node_fs_1.existsSync)(targetCachePath) && (0, node_fs_1.existsSync)(outputNSFilePath)) {
                        console.log(`cache file and output file exists, skip for namespace ${ns} - locale ${targetLocale}`);
                        return;
                    }
                }
                const namespace = path.parse(ns).name;
                runworks.push({
                    namespace: namespace,
                    baseLocale,
                    locale: targetLocale,
                    inputNSFilePath,
                    outputNSFilePath,
                    cachePath,
                });
            });
        });
        const namespacesStats = {
            total: runworks.length,
            success: 0,
            failed: 0,
        };
        await Promise.all(runworks.map(async (work) => {
            const { onResult, onStart, onProgress } = options;
            onStart?.(work);
            try {
                const task = new task_1.Task(this, work);
                const data = await task.start((current, total) => {
                    onProgress?.(current, total, work);
                });
                namespacesStats.success++;
                onResult?.({ work, content: data, failed: false });
                // after success, write the cache file
                if (cacheEnabled) {
                    const pairHash = (0, util_1.getPairHash)(work.inputNSFilePath, work.outputNSFilePath);
                    const targetCachePath = path.join(cachePath, pairHash);
                    // just save an empty file as the cache file
                    await fs.ensureFile(targetCachePath);
                }
            }
            catch (error) {
                namespacesStats.failed++;
                onResult?.({ work, failed: true, content: '', reason: error });
            }
        }));
        // Clean up stale cache files based on existing translation outputs
        if (cacheEnabled) {
            const validHashes = [];
            // For each target locale, scan its output directory for translated files
            for (const targetLocale of targetLocales) {
                if (isFlatLocaleMode) {
                    const inputPath = this.getInputNSFilePath('app');
                    const outputPath = this.getOutputNSFilePath(targetLocale, 'app');
                    if (await fs.pathExists(outputPath)) {
                        validHashes.push((0, util_1.getPairHash)(inputPath, outputPath));
                    }
                    continue;
                }
                const outputLocaleDir = path.resolve(localePath, targetLocale);
                // Find all JSON namespaces in this locale
                const outputFiles = await (0, glob_1.glob)(namespaceGlob, { cwd: outputLocaleDir });
                for (const ns of outputFiles) {
                    const inputPath = this.getInputNSFilePath(ns);
                    const outputPath = this.getOutputNSFilePath(targetLocale, ns);
                    // Only generate a hash if the output file actually exists
                    if (await fs.pathExists(outputPath)) {
                        validHashes.push((0, util_1.getPairHash)(inputPath, outputPath));
                    }
                }
            }
            // If the cache directory exists, remove any file whose name isn't in validHashes
            if (await fs.pathExists(cachePath)) {
                const entries = await fs.readdir(cachePath);
                for (const entry of entries) {
                    if (!validHashes.includes(entry)) {
                        await fs.remove(path.join(cachePath, entry));
                        console.log(`Removed stale cache file: ${entry}`);
                    }
                }
            }
        }
        return {
            namespaces: namespacesStats,
        };
    }
    async processSingleNamespace(work, options) {
        const { onResult, onStart, onProgress } = options;
        onStart?.(work);
        try {
            const task = new task_1.Task(this, work);
            const data = await task.start((current, total) => {
                onProgress?.(current, total, work);
            });
            onResult?.({ work, content: data, failed: false });
        }
        catch (error) {
            onResult?.({ work, failed: true, content: '', reason: error });
        }
    }
    validateParams() {
        const { baseLocale, localePath, openAIApiKey, locales, requestsPerMinuteLimit, tokensPerMinuteLimit } = this.options;
        if (typeof baseLocale !== 'string')
            throw new Error('valid `baseLocale` must be provided');
        if (typeof openAIApiKey !== 'string')
            throw new Error('valid `openAIApiKey` must be provided');
        if (!Array.isArray(locales) || locales.some((i) => typeof i !== 'string'))
            throw new Error('`locales` must be Array of string');
        if (requestsPerMinuteLimit !== undefined &&
            (!Number.isInteger(requestsPerMinuteLimit) || requestsPerMinuteLimit < 1)) {
            throw new Error('`requestsPerMinuteLimit` must be a positive integer');
        }
        if (tokensPerMinuteLimit !== undefined && (!Number.isInteger(tokensPerMinuteLimit) || tokensPerMinuteLimit < 1)) {
            throw new Error('`tokensPerMinuteLimit` must be a positive integer');
        }
        const baseLocaleFullPath = this.getBaseLocaleFullPath();
        if (!fs.existsSync(baseLocaleFullPath))
            throw new Error('`localePath` not existed');
        if (this.isFlatLocaleMode() && !fs.existsSync(this.getInputNSFilePath('app'))) {
            throw new Error('base locale file not existed');
        }
        // TODO: structure
        this.options = Object.assign({}, DEFAULT_PARAMS, this.options);
    }
    isFlatLocaleMode() {
        return Boolean(this.options.vuei18n || this.options.singleFileMode);
    }
    getBaseLocaleFullPath() {
        const { baseLocale, localePath } = this.options;
        return this.isFlatLocaleMode() ? localePath : path.resolve(localePath, baseLocale);
    }
    getInputNSFilePath(ns) {
        const { baseLocale } = this.options;
        const baseLocaleFullPath = this.getBaseLocaleFullPath();
        return this.isFlatLocaleMode()
            ? path.resolve(baseLocaleFullPath, `${baseLocale}.json`)
            : path.resolve(baseLocaleFullPath, ns);
    }
    getOutputNSFilePath(targetLocale, ns) {
        const { localePath } = this.options;
        const baseLocaleFullPath = this.getBaseLocaleFullPath();
        return this.isFlatLocaleMode()
            ? path.resolve(baseLocaleFullPath, `${targetLocale}.json`)
            : path.resolve(localePath, targetLocale, ns);
    }
}
exports.Transmart = Transmart;
//# sourceMappingURL=transmart.js.map