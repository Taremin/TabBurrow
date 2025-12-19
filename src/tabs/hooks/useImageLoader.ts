/**
 * TabBurrow - 画像遅延読み込み/解放フック
 * IntersectionObserverを使用してビューポート進入時に画像を読み込み、退出時に解放
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseImageLoaderOptions {
  rootMargin?: string;
  threshold?: number;
}

interface UseImageLoaderResult {
  url: string | null;
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
}

/**
 * 画像の遅延読み込みと解放を管理するフック
 * - ビューポート進入時: BlobからObject URLを生成
 * - ビューポート退出時: Object URLを解放
 * - 表示モード切替時: URLを保持（要素が変わっても維持）
 */
export function useImageLoader(
  blob: Blob | null,
  options: UseImageLoaderOptions = {}
): UseImageLoaderResult {
  const { rootMargin = '100px', threshold = 0 } = options;
  const [url, setUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const urlRef = useRef<string | null>(null);



  // URLを生成（まだ生成されていない場合のみ）
  const generateUrl = useCallback(() => {
    if (blob && blob.size > 0 && !urlRef.current) {
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
    }
  }, [blob]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      // 要素がない場合でも、既存のURLは保持する（表示モード切替対応）
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          // ビューポート進入: 画像読み込み
          generateUrl();
        }
        // ビューポート退出時のクリーンアップは行わない
        // メモリ効率は少し下がるが、表示モード切替時の安定性を優先
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    // 要素がビューポート内にあるかすぐにチェック
    // 表示モード切替後にURLを再生成するため
    const rect = element.getBoundingClientRect();
    const isInViewport = rect.top < window.innerHeight + 100 && rect.bottom > -100;
    if (isInViewport) {
      generateUrl();
    }

    return () => {
      observer.disconnect();
      // 注意: ここではクリーンアップしない（表示モード切替時にURLを保持するため）
    };
  }, [blob, rootMargin, threshold, generateUrl]);

  // コンポーネントの完全アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return { url, ref, isVisible };
}
