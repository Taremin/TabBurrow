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

  // Object URLのクリーンアップ
  const cleanup = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setUrl(null);
    }
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);

        if (entry.isIntersecting) {
          // ビューポート進入: 画像読み込み
          if (blob && blob.size > 0 && !urlRef.current) {
            const objectUrl = URL.createObjectURL(blob);
            urlRef.current = objectUrl;
            setUrl(objectUrl);
          }
        } else {
          // ビューポート退出: 画像解放
          cleanup();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cleanup();
    };
  }, [blob, rootMargin, threshold, cleanup]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { url, ref, isVisible };
}
