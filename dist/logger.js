"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoLogger = exports.routeLogger = exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor(layer, name) {
        this.layer = layer;
        this.name = name;
    }
    static routeLogger(route, method) {
        console.log(Logger.routeMessage(`[${method.toUpperCase()}:[${route}]`));
    }
    static infoLogger({ message, status, layer, name }) {
        let output = "";
        const prefix = Logger.getPrefix(layer, name);
        switch (status) {
            case "success":
                output = Logger.successMessage(message);
                break;
            case "INFO":
                output = Logger.infoMessage(message);
                break;
            case "failed":
                output = Logger.errorMessage(message);
                break;
            default:
                output = Logger.alertMessage(message);
                break;
        }
        console.log(prefix + output);
    }
    static getPrefix(layer, name) {
        if (layer == "SERVICE" || layer == "CONTROLLER" || layer == "DB") {
            return `[${layer}]:[${name}]`;
        }
        return `[${layer}]`;
    }
    static getCurrentTime() {
        const date = new Date(Date.now());
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return chalk_1.default.white(chalk_1.default.bgGray(" TIME: " + `${hours}:${minutes}:${seconds}`) + " ");
    }
    static successMessage(message) {
        return chalk_1.default.black(chalk_1.default.bgGreen("SUCCESS ") + Logger.getCurrentTime() + chalk_1.default.white(message));
    }
    static routeMessage(message) {
        return chalk_1.default.black(chalk_1.default.bgHex("#FFC0CB")("INFO") +
            Logger.getCurrentTime() +
            chalk_1.default.white(message));
    }
    static infoMessage(message) {
        return chalk_1.default.black(chalk_1.default.bgCyan("INFO") + Logger.getCurrentTime() + chalk_1.default.white(message));
    }
    static errorMessage(message) {
        return chalk_1.default.white(chalk_1.default.bgRed("ERROR ") + Logger.getCurrentTime() + message);
    }
    static alertMessage(message) {
        return chalk_1.default.black(chalk_1.default.bgYellow("ALERT ") + Logger.getCurrentTime() + chalk_1.default.white(message));
    }
}
// Export an instance of Logger for default usage
exports.logger = new Logger();
// Export Logger class for custom usage
// export { Logger };
exports.routeLogger = Logger.routeLogger;
exports.infoLogger = Logger.infoLogger;
