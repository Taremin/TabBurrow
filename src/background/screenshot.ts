/**
 * screenshot.ts - スクリーンショット関連処理
 * キャプチャ、リサイズ、キュー処理を担当
 */

import browser from '../browserApi.js';

/**
 * スクリーンショット取得キュー
 * captureVisibleTab のレート制限を回避するため、順番に処理する
 */
class ScreenshotQueue {
  private queue: Array<{
    windowId: number;
    resolve: (value: string | null) => void;
  }> = [];
  private processing = false;
  private readonly DELAY_BETWEEN_CAPTURES_MS = 500; // キャプチャ間の待機時間

  async enqueue(windowId: number): Promise<string | null> {
    return new Promise((resolve) => {
      this.queue.push({ windowId, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const result = await this.captureWithRetry(item.windowId);
      item.resolve(result);
      
      // 次のキャプチャまで待機（レート制限対策）
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_CAPTURES_MS));
      }
    }
    
    this.processing = false;
  }

  private async captureWithRetry(windowId: number, retryCount = 0): Promise<string | null> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 500;

    try {
      const dataURL = await browser.tabs.captureVisibleTab(windowId, {
        format: 'jpeg',
        quality: 80,
      });
      return dataURL;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // レート制限エラーの場合はリトライ
      if (errorMessage.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') && retryCount < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, retryCount);
        console.log(`スクリーンショットレート制限: ${delayMs}ms後にリトライ (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.captureWithRetry(windowId, retryCount + 1);
      }
      
      console.warn('スクリーンショット取得エラー:', error);
      return null;
    }
  }
}

// スクリーンショットキューのインスタンス
const screenshotQueue = new ScreenshotQueue();

/**
 * Data URLをBlobに変換
 */
function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binaryString = atob(parts[1]);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: mime });
}

/**
 * スクリーンショットを512x512にリサイズ
 */
export async function resizeScreenshot(dataURL: string): Promise<Blob> {
  // OffscreenCanvasを使用（Service Worker内で使用可能）
  const img = await createImageBitmap(dataURLtoBlob(dataURL));
  
  const targetSize = 512;
  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // アスペクト比を維持してリサイズ
  const scale = Math.min(targetSize / img.width, targetSize / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (targetSize - width) / 2;
  const y = (targetSize - height) / 2;

  // 背景を白で塗りつぶし
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetSize, targetSize);
  
  // 画像を描画
  ctx.drawImage(img, x, y, width, height);

  // JPEGとしてBlobに変換
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
}

/**
 * 現在のタブのスクリーンショットを取得
 * キューを使用してレート制限を回避
 */
export async function captureTab(windowId: number): Promise<string | null> {
  return screenshotQueue.enqueue(windowId);
}

