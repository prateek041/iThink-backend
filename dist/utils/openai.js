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
exports.getValidArguments = exports.validateResponse = exports.chatComplete = void 0;
exports.getOpenAIClient = getOpenAIClient;
const zod_1 = require("zod");
const dotenv = __importStar(require("dotenv"));
const openai_1 = require("openai");
const logger_1 = require("../logger");
const zod_2 = require("openai/helpers/zod");
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = "gpt-4o";
const apiVersion = "2024-08-01-preview";
const apiKey = process.env.AZURE_OPENAI_API_KEY;
dotenv.config({ path: ".env" });
const modelName = "gpt-4o";
const openAIClient = new openai_1.AzureOpenAI({
    endpoint: azureEndpoint,
    apiKey: apiKey,
    apiVersion,
    deployment: deploymentName
});
function getOpenAIClient() {
    return openAIClient;
}
;
/**
 * chatComplete uses the OpenAI's chat completions API to return a response following a certain schema.
 */
const chatComplete = (_a) => __awaiter(void 0, [_a], void 0, function* ({ prompt, systemPrompt, validatorSchema, model = "gpt-4o", validatorSchemaName, }) {
    try {
        const azureClient = getOpenAIClient();
        (0, logger_1.infoLogger)({ message: "initiating chat completion" });
        const completion = yield azureClient.beta.chat.completions.parse({
            model: model,
            response_format: (0, zod_2.zodResponseFormat)(validatorSchema, validatorSchemaName),
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });
        const output = completion.choices[0].message.parsed;
        if (!output) {
            (0, logger_1.infoLogger)({
                message: "error complete chat",
                status: "failed",
                layer: "SERVICE",
                name: "OPENAI",
            });
            throw new Error("error completing chat");
        }
        (0, logger_1.infoLogger)({
            message: "chat complete -> success",
            status: "success",
            layer: "SERVICE",
            name: "OPENAI",
        });
        return validatorSchema.parse(output);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error("Validation Error", error.errors);
            throw new Error("Failed to validate AI response");
        }
        // OpenAI error
        throw error;
    }
});
exports.chatComplete = chatComplete;
const validateResponse = (_a) => __awaiter(void 0, [_a], void 0, function* ({ prompt, validatorSchema, validatorSchemaName, }) {
    const systemPrompt = "out of the user's input prompt, generate a structured output that follows the given schema in json properly";
    const validatedResponse = yield (0, exports.chatComplete)({
        prompt,
        validatorSchema,
        validatorSchemaName,
        systemPrompt,
    });
    console.log(`Success: valid data for ${validatorSchemaName} generated`);
    return validatedResponse;
});
exports.validateResponse = validateResponse;
const getValidArguments = (_a) => __awaiter(void 0, [_a], void 0, function* ({ data, validatorSchema, validatorSchemaName }) {
    const validate = validatorSchema.safeParse(data);
    if (!validate.success) {
        return yield (0, exports.validateResponse)({ prompt: data, validatorSchema: validatorSchema, validatorSchemaName: validatorSchemaName });
    }
    return validate.data;
});
exports.getValidArguments = getValidArguments;
