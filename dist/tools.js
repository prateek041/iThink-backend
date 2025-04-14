"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearchTool = void 0;
exports.webSearchTool = {
    type: "function",
    description: "Use this tool to search for web to give factual responses in your discussions.",
    name: "search_web",
    parameters: {
        type: "object",
        required: ["query, topic"],
        properties: {
            query: {
                type: "string",
                description: "The question to be searched on the web.",
            },
            topic: {
                type: "string",
                description: "Topic of the question. Can only be one of the three possible values, 'general', 'news', 'finance'.",
            },
        },
    }
};
