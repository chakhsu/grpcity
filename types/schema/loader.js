"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const addressSchema = joi_1.default.object()
    .pattern(/\.*/, joi_1.default.alternatives([
    joi_1.default.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    joi_1.default.object({
        host: joi_1.default.string().required(),
        port: joi_1.default.number().integer().min(0).max(65535).required()
    })
]));
const loaderSchemas = {
    constructor: joi_1.default.array().items(joi_1.default.object({
        location: joi_1.default.string().required(),
        files: joi_1.default.array().items(joi_1.default.string()).required()
    })).single(),
    init: joi_1.default.object({
        services: addressSchema.optional(),
        isDev: joi_1.default.boolean().optional(),
        packagePrefix: joi_1.default.string().optional(),
        loadOptions: joi_1.default.object().optional(),
        channelOptions: joi_1.default.object().optional(),
        appName: joi_1.default.string().optional()
    }),
    initClients: joi_1.default.object({
        services: addressSchema.required(),
        channelOptions: joi_1.default.object().optional()
    })
};
exports.default = loaderSchemas;
