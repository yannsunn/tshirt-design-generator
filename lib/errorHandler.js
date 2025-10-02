// Centralized error handling utility for API endpoints
// Provides consistent error responses and logging

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, true);
        this.details = details;
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, true);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, true);
    }
}

export class ExternalAPIError extends AppError {
    constructor(service, message, originalError = null) {
        super(`${service} API error: ${message}`, 502, true);
        this.service = service;
        this.originalError = originalError;
    }
}

/**
 * Error handler middleware
 * Catches all errors and returns appropriate HTTP responses
 */
export function errorHandler(error, req, res) {
    // Default to 500 server error
    let statusCode = 500;
    let message = 'Internal server error';
    let details = null;

    // Handle known error types
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        if (error instanceof ValidationError) {
            details = error.details;
        }
    } else if (error.name === 'ValidationError') {
        // Mongoose/Joi validation errors
        statusCode = 400;
        message = 'Validation error';
        details = error.details || error.message;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // Network errors
        statusCode = 503;
        message = 'Service temporarily unavailable';
    }

    // Log error (in production, send to logging service)
    console.error('API Error:', {
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method,
        statusCode,
        message: error.message,
        stack: error.stack,
        ...(details && { details })
    });

    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    const response = {
        error: message,
        ...(details && { details }),
        ...(statusCode === 429 && error.retryAfter && { retryAfter: error.retryAfter }),
        ...(!isProduction && { stack: error.stack })
    };

    res.status(statusCode).json(response);
}

/**
 * Async handler wrapper
 * Catches errors from async route handlers
 * Usage: export default asyncHandler(async (req, res) => { ... })
 */
export function asyncHandler(handler) {
    return async function wrappedHandler(req, res) {
        try {
            await handler(req, res);
        } catch (error) {
            errorHandler(error, req, res);
        }
    };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);

    if (missing.length > 0) {
        throw new ValidationError(
            `Missing required fields: ${missing.join(', ')}`,
            { missingFields: missing }
        );
    }
}

/**
 * Validate environment variables
 */
export function validateEnv(requiredEnvVars) {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new AppError(
            `Server configuration error: Missing environment variables`,
            500,
            false // Not operational - requires manual intervention
        );
    }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON parse error:', error.message);
        return defaultValue;
    }
}

/**
 * Sanitize error message for external API errors
 * Removes sensitive information like API keys
 */
export function sanitizeErrorMessage(message) {
    // Remove anything that looks like an API key or token
    return message
        .replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]')
        .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
        .replace(/key[=:]\s*[^\s&]+/gi, 'key=[REDACTED]');
}
