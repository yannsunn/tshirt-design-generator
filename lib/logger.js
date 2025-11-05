/**
 * 統一エラーロガー
 * 既存コードに影響を与えず、エラー監視を強化
 */

/**
 * ログレベル
 */
export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

/**
 * センシティブ情報をマスキング
 */
const SENSITIVE_KEYS = [
  'password', 'token', 'apiKey', 'api_key', 'secret', 'authorization',
  'bearer', 'api-key', 'x-api-key', 'access_token', 'refresh_token',
  'client_secret', 'private_key', 'apikey', 'auth'
];

function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sk => keyLower.includes(sk));

    if (isSensitive && typeof value === 'string' && value.length > 10) {
      // 最初の4文字のみ表示
      masked[key] = `${value.substring(0, 4)}...[REDACTED]`;
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * ログフォーマット
 */
class Logger {
  constructor(context = 'unknown') {
    this.context = context;
    // 環境変数からログレベルを取得
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  /**
   * 構造化ログを出力
   */
  _log(level, message, meta = {}) {
    // ログレベルフィルタリング
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex < currentLevelIndex) {
      return; // ログレベルが低い場合はスキップ
    }

    // センシティブ情報をマスキング
    const safeMeta = maskSensitiveData(meta);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...safeMeta,
      // Vercel環境の識別
      environment: process.env.VERCEL_ENV || 'development'
    };

    // コンソール出力（Vercelログに記録）
    const output = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      default:
        console.log(output);
    }

    return logEntry;
  }

  /**
   * INFOログ
   */
  info(message, meta = {}) {
    return this._log(LogLevel.INFO, message, meta);
  }

  /**
   * WARNログ
   */
  warn(message, meta = {}) {
    return this._log(LogLevel.WARN, message, meta);
  }

  /**
   * ERRORログ
   */
  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // エラーの追加情報
        ...(error.response && {
          response: {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          }
        })
      } : null
    };

    return this._log(LogLevel.ERROR, message, errorMeta);
  }

  /**
   * DEBUGログ（開発環境のみ）
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      return this._log(LogLevel.DEBUG, message, meta);
    }
  }

  /**
   * API呼び出しログ
   */
  apiCall(method, url, duration, status, meta = {}) {
    return this.info('API Call', {
      method,
      url,
      duration,
      status,
      ...meta
    });
  }

  /**
   * パフォーマンス計測
   */
  startTimer(label) {
    const start = Date.now();
    return {
      end: (meta = {}) => {
        const duration = Date.now() - start;
        this.info(`Timer: ${label}`, { duration, ...meta });
        return duration;
      }
    };
  }
}

/**
 * ロガーインスタンス作成
 */
export function createLogger(context) {
  return new Logger(context);
}

/**
 * エラーレスポンス生成
 */
export function createErrorResponse(logger, error, statusCode = 500) {
  // ログに記録
  logger.error('Request failed', error, {
    statusCode
  });

  // ユーザーに返すレスポンス
  return {
    status: 'error',
    message: error.message || 'Internal server error',
    // 本番環境ではスタックトレースを隠す
    ...(process.env.NODE_ENV !== 'production' && {
      stack: error.stack
    })
  };
}

/**
 * 成功レスポンス生成
 */
export function createSuccessResponse(data, meta = {}) {
  return {
    status: 'success',
    data,
    ...meta
  };
}

export default Logger;
