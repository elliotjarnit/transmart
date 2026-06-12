"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainObject = exports.splitJSONtoSmallChunks = void 0;
const gpt_3_encoder_1 = require("gpt-3-encoder");
function splitJSONtoSmallChunks(object, options) {
    const maxInputToken = Math.floor(options.modelContextLimit * options.modelContextSplit);
    const chunks = [];
    const keys = Object.keys(object);
    const totalLength = keys.length;
    let keysLength = totalLength;
    let tempChunk = {};
    let chunkSize = 2;
    while (keysLength > 0) {
        const key = keys[totalLength - keysLength];
        const value = object[key];
        const keySize = (0, gpt_3_encoder_1.encode)(key).length + 2; // "key":
        const nextValueSize = isPlainObject(value) ? getJSONTokenSize(value, 1) : getPrimitiveValueSize(value);
        const entrySize = 1 + keySize + nextValueSize; // \n + "key": + value
        if (chunkSize + entrySize > maxInputToken) {
            // If temp chunk has content, save it first
            if (Object.keys(tempChunk).length > 0) {
                chunks.push({ ...tempChunk });
                tempChunk = {};
                chunkSize = 2;
            }
            // If the single entry itself is too large, add it to its own chunk anyway
            // Otherwise we'd have an infinite loop
            tempChunk[key] = value;
            chunks.push({ ...tempChunk });
            tempChunk = {};
            chunkSize = 2;
        }
        else {
            tempChunk[key] = value;
            chunkSize += entrySize;
        }
        keysLength--;
    }
    if (Object.keys(tempChunk).length) {
        chunks.push(tempChunk);
    }
    return chunks;
}
exports.splitJSONtoSmallChunks = splitJSONtoSmallChunks;
function isPlainObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}
exports.isPlainObject = isPlainObject;
// almost close to json
function getJSONTokenSize(object, depth = 0) {
    const keys = Object.keys(object);
    const totalLength = keys.length;
    let keysLength = totalLength;
    let tokenCount = 1; // {
    while (keysLength > 0) {
        const key = keys[totalLength - keysLength];
        const value = object[key];
        tokenCount += 1; // \n
        tokenCount += depth * 2; // indent
        tokenCount += (0, gpt_3_encoder_1.encode)(key).length + 2; // "key":
        if (isPlainObject(value)) {
            tokenCount += getJSONTokenSize(value, depth + 1);
        }
        else {
            tokenCount += getPrimitiveValueSize(value);
        }
        keysLength--;
    }
    tokenCount += 2; // '\n'
    tokenCount += depth; // }
    return tokenCount;
}
function getPrimitiveValueSize(value) {
    return (0, gpt_3_encoder_1.encode)(value).length + 3; // "value",
}
//# sourceMappingURL=split.js.map