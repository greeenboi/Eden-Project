import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, LogLevel } from "../lib/logger";

describe("Logger", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe("Log levels", () => {
		it("should log debug messages when level is DEBUG", () => {
			const logger = createLogger(LogLevel.DEBUG);
			logger.debug("test message", { foo: "bar" });

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
			expect(logOutput.level).toBe("DEBUG");
			expect(logOutput.message).toBe("test message");
			expect(logOutput.foo).toBe("bar");
		});

		it("should not log debug messages when level is INFO", () => {
			const logger = createLogger(LogLevel.INFO);
			logger.debug("test message");

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it("should log info messages", () => {
			const logger = createLogger(LogLevel.INFO);
			logger.info("info message");

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
			expect(logOutput.level).toBe("INFO");
			expect(logOutput.message).toBe("info message");
		});

		it("should log warnings", () => {
			const logger = createLogger(LogLevel.INFO);
			logger.warn("warning message", { code: "WARN_001" });

			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			const logOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);
			expect(logOutput.level).toBe("WARN");
			expect(logOutput.code).toBe("WARN_001");
		});

		it("should log errors with Error objects", () => {
			const logger = createLogger(LogLevel.INFO);
			const error = new Error("Something went wrong");
			logger.error("error occurred", error);

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
			expect(logOutput.level).toBe("ERROR");
			expect(logOutput.error.message).toBe("Something went wrong");
			expect(logOutput.error.stack).toBeDefined();
		});
	});

	describe("Structured logging", () => {
		it("should include timestamp in all logs", () => {
			const logger = createLogger(LogLevel.INFO);
			logger.info("test");

			const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
			expect(logOutput.timestamp).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
			);
		});

		it("should merge context into log output", () => {
			const logger = createLogger(LogLevel.INFO);
			logger.info("test", { userId: "123", action: "upload" });

			const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
			expect(logOutput.userId).toBe("123");
			expect(logOutput.action).toBe("upload");
		});
	});
});
