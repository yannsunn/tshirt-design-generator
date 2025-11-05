// Unified fetch with timeout utility
// Replaces duplicated AbortController patterns across all API endpoints

/**
 * Fetch with automatic timeout
 * @param {string} url - Target URL
 * @param {object} options - Fetch options (headers, method, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000ms)
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} On timeout or network error
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms to ${url}`);
        }

        throw error;
    }
}

/**
 * Fetch with automatic timeout and JSON parsing
 * @param {string} url - Target URL
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} On timeout, network error, or non-2xx status
 */
export async function fetchJSON(url, options = {}, timeoutMs = 10000) {
    const response = await fetchWithTimeout(url, options, timeoutMs);

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
}
