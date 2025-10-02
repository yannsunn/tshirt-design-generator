// Simple in-memory rate limiter for serverless functions
// Tracks API calls per IP address to prevent abuse

const rateLimit = new Map();

/**
 * Rate limiter configuration
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.maxRequests - Maximum requests per window (default: 10)
 */
export function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || 60000; // 1 minute
    const maxRequests = options.maxRequests || 10;

    return function checkRateLimit(identifier) {
        const now = Date.now();
        const userRequests = rateLimit.get(identifier) || [];

        // Remove expired requests outside the time window
        const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

        // Check if user has exceeded rate limit
        if (validRequests.length >= maxRequests) {
            const oldestRequest = Math.min(...validRequests);
            const resetTime = oldestRequest + windowMs;
            const retryAfter = Math.ceil((resetTime - now) / 1000); // seconds

            return {
                allowed: false,
                retryAfter,
                limit: maxRequests,
                remaining: 0,
                reset: new Date(resetTime).toISOString()
            };
        }

        // Add current request
        validRequests.push(now);
        rateLimit.set(identifier, validRequests);

        return {
            allowed: true,
            limit: maxRequests,
            remaining: maxRequests - validRequests.length,
            reset: new Date(now + windowMs).toISOString()
        };
    };
}

/**
 * Get identifier from request (IP address or user agent)
 */
export function getClientIdentifier(req) {
    // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const vercelIp = req.headers['x-vercel-forwarded-for'];

    const ip = forwarded?.split(',')[0] || realIp || vercelIp || req.socket?.remoteAddress || 'unknown';

    // For more specific tracking, combine IP with user agent
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create a simple hash for privacy
    return `${ip}-${userAgent.substring(0, 50)}`;
}

/**
 * Middleware wrapper for rate limiting
 * Usage: export default rateLimitMiddleware(handler, { maxRequests: 5, windowMs: 60000 })
 */
export function rateLimitMiddleware(handler, options = {}) {
    const checkRateLimit = createRateLimiter(options);

    return async function rateLimitedHandler(req, res) {
        const identifier = getClientIdentifier(req);
        const result = checkRateLimit(identifier);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', result.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.reset);

        if (!result.allowed) {
            res.setHeader('Retry-After', result.retryAfter);
            return res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
                retryAfter: result.retryAfter
            });
        }

        // Call the original handler
        return handler(req, res);
    };
}

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [identifier, requests] of rateLimit.entries()) {
        const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
        if (validRequests.length === 0) {
            rateLimit.delete(identifier);
        } else {
            rateLimit.set(identifier, validRequests);
        }
    }
}, 300000);
