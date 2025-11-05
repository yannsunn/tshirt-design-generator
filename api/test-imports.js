/**
 * Test module imports in Vercel environment
 */

export default async function handler(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    imports: {}
  };

  // Test each import individually
  try {
    const { asyncHandler } = await import('../lib/errorHandler.js');
    results.imports.errorHandler = 'success';
    results.imports.asyncHandlerType = typeof asyncHandler;
  } catch (error) {
    results.imports.errorHandler = `failed: ${error.message}`;
  }

  try {
    const { rateLimitMiddleware } = await import('../lib/rateLimiter.js');
    results.imports.rateLimiter = 'success';
    results.imports.rateLimitMiddlewareType = typeof rateLimitMiddleware;
  } catch (error) {
    results.imports.rateLimiter = `failed: ${error.message}`;
  }

  try {
    const { fetchWithTimeout } = await import('../lib/fetchWithTimeout.js');
    results.imports.fetchWithTimeout = 'success';
    results.imports.fetchWithTimeoutType = typeof fetchWithTimeout;
  } catch (error) {
    results.imports.fetchWithTimeout = `failed: ${error.message}`;
  }

  try {
    const { createLogger } = await import('../lib/logger.js');
    results.imports.logger = 'success';
    results.imports.createLoggerType = typeof createLogger;

    // Try to create a logger
    const testLogger = createLogger('test');
    results.imports.loggerInstanceCreated = !!testLogger;
    results.imports.loggerMethods = Object.keys(testLogger);
  } catch (error) {
    results.imports.logger = `failed: ${error.message}`;
    results.imports.loggerStack = error.stack;
  }

  res.status(200).json(results);
}
