'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
const joi_1 = __importDefault(require('joi'))
const serverSchemas = {
  address: joi_1.default.alternatives([
    joi_1.default.string().regex(/:/, 'host and port like 127.0.0.1:9090'),
    joi_1.default.object({
      host: joi_1.default.string().required(),
      port: joi_1.default.number().integer().min(0).max(65535).required()
    })
  ])
}
exports.default = serverSchemas
