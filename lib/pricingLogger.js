// 価格変更ログシステム（Vercel無料プラン対応）
// Vercelは読み取り専用ファイルシステムのため、ローカル/GitHub Actions実行時のみファイル保存
// API実行時はレスポンスにログ情報を含める

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'pricing-reports');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error-log.json');
const CHANGE_LOG_FILE = path.join(LOG_DIR, 'pricing-change-log.json');

// 環境検出: Vercelサーバーレス環境かどうか
const isVercelRuntime = process.env.VERCEL === '1';

/**
 * ログエントリを作成
 */
function createLogEntry(type, data) {
    return {
        timestamp: new Date().toISOString(),
        type,
        ...data
    };
}

/**
 * エラーログを記録
 * Vercel環境: console.errorのみ
 * ローカル/GitHub Actions: ファイル + console.error
 */
export function logError(context, error, additionalData = {}) {
    const entry = createLogEntry('error', {
        context,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        ...additionalData
    });

    // 常にコンソール出力（Vercelログに記録される）
    console.error('❌ ERROR:', JSON.stringify(entry, null, 2));

    // ローカル環境のみファイル保存
    if (!isVercelRuntime) {
        try {
            appendToLogFile(ERROR_LOG_FILE, entry);
        } catch (fileError) {
            console.error('Failed to write error log file:', fileError);
        }
    }

    return entry;
}

/**
 * 価格変更ログを記録
 */
export function logPriceChange(productId, shopId, changes) {
    const entry = createLogEntry('price_change', {
        productId,
        shopId,
        changes: {
            oldPrice: changes.oldPrice,
            newPrice: changes.newPrice,
            blueprint: changes.blueprint,
            margin: changes.margin,
            reason: changes.reason
        }
    });

    // 常にコンソール出力
    console.log('💰 PRICE_CHANGE:', JSON.stringify(entry, null, 2));

    // ローカル環境のみファイル保存
    if (!isVercelRuntime) {
        try {
            appendToLogFile(CHANGE_LOG_FILE, entry);
        } catch (fileError) {
            console.error('Failed to write change log file:', fileError);
        }
    }

    return entry;
}

/**
 * バッチ更新ログを記録
 */
export function logBatchUpdate(summary) {
    const entry = createLogEntry('batch_update', summary);

    console.log('📊 BATCH_UPDATE:', JSON.stringify(entry, null, 2));

    if (!isVercelRuntime) {
        try {
            const filename = path.join(LOG_DIR, `batch-update-${Date.now()}.json`);
            fs.writeFileSync(filename, JSON.stringify(entry, null, 2));
        } catch (fileError) {
            console.error('Failed to write batch log file:', fileError);
        }
    }

    return entry;
}

/**
 * ログファイルに追記（ローカル専用）
 */
function appendToLogFile(filename, entry) {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    let logs = [];
    if (fs.existsSync(filename)) {
        try {
            const content = fs.readFileSync(filename, 'utf-8');
            logs = JSON.parse(content);
        } catch (e) {
            console.warn('Failed to parse existing log file, creating new one');
        }
    }

    logs.push(entry);

    // 最新1000件のみ保持
    if (logs.length > 1000) {
        logs = logs.slice(-1000);
    }

    fs.writeFileSync(filename, JSON.stringify(logs, null, 2));
}

/**
 * エラーログを取得（ローカル専用）
 */
export function getErrorLogs(limit = 100) {
    if (isVercelRuntime) {
        return { error: 'Log files not available in Vercel runtime. Check Vercel logs.' };
    }

    try {
        if (!fs.existsSync(ERROR_LOG_FILE)) {
            return [];
        }
        const content = fs.readFileSync(ERROR_LOG_FILE, 'utf-8');
        const logs = JSON.parse(content);
        return logs.slice(-limit);
    } catch (e) {
        console.error('Failed to read error logs:', e);
        return [];
    }
}

/**
 * 価格変更ログを取得（ローカル専用）
 */
export function getPriceChangeLogs(limit = 100) {
    if (isVercelRuntime) {
        return { error: 'Log files not available in Vercel runtime. Check Vercel logs.' };
    }

    try {
        if (!fs.existsSync(CHANGE_LOG_FILE)) {
            return [];
        }
        const content = fs.readFileSync(CHANGE_LOG_FILE, 'utf-8');
        const logs = JSON.parse(content);
        return logs.slice(-limit);
    } catch (e) {
        console.error('Failed to read price change logs:', e);
        return [];
    }
}
