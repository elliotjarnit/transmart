"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const promises_1 = require("node:fs/promises");
const translate_1 = require("./translate");
const split_1 = require("./split");
const limit_1 = require("./limit");
const jsonrepair_1 = require("jsonrepair");
class Task {
    transmart;
    work;
    constructor(transmart, work) {
        this.transmart = transmart;
        this.work = work;
    }
    async start(onProgress) {
        const { inputNSFilePath, namespace, locale } = this.work;
        const { modelContextLimit, modelContextSplit } = this.transmart.options;
        const content = await (0, promises_1.readFile)(inputNSFilePath, { encoding: 'utf-8' });
        const chunks = (0, split_1.splitJSONtoSmallChunks)(JSON.parse(content), { modelContextLimit, modelContextSplit });
        let count = 0;
        const p = chunks.map((chunk, index) => {
            return (0, limit_1.limit)(() => (async () => {
                const result = await this.run(JSON.stringify(chunk, null, 2), index);
                count++;
                onProgress(count, chunks.length);
                return result;
            })());
        });
        const results = await Promise.all(p);
        const namespaceResult = this.pack(results);
        const { overrides } = this.transmart.options;
        // override with user provided
        if (overrides && (0, split_1.isPlainObject)(overrides)) {
            Object.entries(overrides).forEach(([overrideKey, value]) => {
                if (overrideKey === locale && (0, split_1.isPlainObject)(value)) {
                    Object.entries(value).forEach(([overrideNs, overrideValues]) => {
                        if (overrideNs === namespace) {
                            Object.assign(namespaceResult, overrideValues);
                        }
                    });
                }
            });
        }
        return JSON.stringify(namespaceResult, null, 2);
    }
    async run(content, index) {
        const { openAIApiKey, openAIApiUrl, openAIApiUrlPath, openAIApiModel, baseLocale, context, systemPromptTemplate, additionalReqBodyParams, } = this.transmart.options;
        const { locale } = this.work;
        const data = await (0, translate_1.translate)({
            content,
            baseLang: baseLocale,
            targetLang: locale,
            context,
            openAIApiModel,
            openAIApiKey,
            openAIApiUrl,
            openAIApiUrlPath,
            systemPromptTemplate,
            additionalReqBodyParams,
        });
        return {
            content: data,
            index,
        };
    }
    parse(content) {
        try {
            const parsedJson = JSON.parse(content);
            return parsedJson;
        }
        catch (e) {
            // try fix using jsonrepair, if it still fails, just raise error
            const parsedJson = JSON.parse((0, jsonrepair_1.jsonrepair)(content));
            return parsedJson;
        }
    }
    pack(result) {
        const onePiece = result
            .sort((a, b) => a.index - b.index)
            .reduce((prev, next) => {
            const parsedJson = this.parse(next.content);
            return {
                ...prev,
                ...parsedJson,
            };
        }, {});
        return onePiece;
    }
}
exports.Task = Task;
//# sourceMappingURL=task.js.map