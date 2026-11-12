let apiPromise: Promise<any> | null = null;

/** Loads the YouTube IFrame Player API script once and resolves with the global YT namespace. */
export function loadYoutubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prevCallback = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve(w.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}
