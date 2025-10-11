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
 * ログフォーマット
 */
class Logger {
  constructor(context = 'unknown') {
    this.context = context;
  }

  /**
   * 構造化ログを出力
   */
  _log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta,
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
