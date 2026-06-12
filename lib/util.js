"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPairHash = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const path = require("path");
/**
 * A function that returns a hash of the input data and output file paths
 * If any of the input data or output file paths change, the hash will change
 * @param inputNSFilePath
 * @param outputNSFilePath
 * @returns
 */
const getPairHash = (inputNSFilePath, outputNSFilePath) => {
    const data = (0, node_fs_1.readFileSync)(inputNSFilePath, { encoding: 'utf-8' });
    const hash = (0, node_crypto_1.createHash)('sha1');
    hash.update(data);
    hash.update(path.relative(process.cwd(), outputNSFilePath));
    return hash.digest('hex');
};
exports.getPairHash = getPairHash;
//# sourceMappingURL=util.js.map