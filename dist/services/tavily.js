"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalWebSearch = void 0;
const dotenv = __importStar(require("dotenv"));
const core_1 = require("@tavily/core");
const zod_1 = require("zod");
const openai_1 = require("../utils/openai");
dotenv.config({ path: ".env" });
const tavilyKey = process.env.TAVILY_KEY;
const client = (0, core_1.tavily)({ apiKey: tavilyKey });
const generalWebSearchArgs = zod_1.z.object({
    query: zod_1.z.string(),
    topic: zod_1.z.enum(["general", "news", "finance"]),
});
const generalWebSearch = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const validArguments = yield (0, openai_1.getValidArguments)({ data: data, validatorSchema: generalWebSearchArgs, validatorSchemaName: "general_search" });
    const response = yield client.search(validArguments.query, {
        searchDepth: "advanced",
        topic: validArguments.topic,
        maxResults: 5
    });
    const result = response.results;
    const responseString = result.map(item => `${item.title}: ${item.content}`).join('\n');
    return responseString;
});
exports.generalWebSearch = generalWebSearch;
