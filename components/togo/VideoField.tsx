import { useRef, useState, type ReactNode } from "react";
import { Video, X } from "lucide-react";

/** Two-option video selector: YouTube link (passed as children) or local upload (simulated progress). */
export function VideoField({ children }: { children: ReactNode }) {
  const [videoTab, setVideoTab] = useState<"youtube" | "upload">("youtube");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [meta, setMeta] = useState("");
  const [hover, setHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMeta(`${file.name} · ${Math.max(1, Math.round(file.size / 1048576))} MB`);
    setUploading(true);
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        setVideoURL(url);
        setUploading(false);
      } else setUploadProgress(Math.round(progress));
    }, 100);
  };

  const tab = (v: "youtube" | "upload", label: string) => (
    <button
      type="button"
      onClick={() => setVideoTab(v)}
      style={{
        padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
        background: videoTab === v ? "var(--color-primary)" : "transparent",
        color: videoTab === v ? "#FFFFFF" : "var(--text-secondary)", transition: "all .2s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: 12, width: "fit-content" }}>
        {tab("youtube", "Link de YouTube")}
        {tab("upload", "Subir video")}
      </div>
      {videoTab === "youtube" ? children : (
        <>
          <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" style={{ display: "none" }} ref={fileInputRef} onChange={handleVideoUpload} />
          {uploading ? (
            <div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--border-default)", overflow: "hidden" }}>
                <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--color-primary)", transition: "width .3s" }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginTop: 8 }}>Subiendo… {uploadProgress}%</p>
            </div>
          ) : videoURL ? (
            <div>
              <div style={{ position: "relative", width: "100%", maxHeight: 180, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <video src={videoURL} controls style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, display: "block" }} />
                <button type="button" aria-label="Quitar video" onClick={() => { setVideoURL(null); setUploadProgress(0); }}
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={12} color="#FFFFFF" />
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>{meta}</p>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className="flex flex-col items-center justify-center"
              style={{
                border: `2px dashed ${hover ? "var(--color-primary)" : "var(--border-default)"}`,
                background: hover ? "var(--color-primary-light)" : "transparent",
                borderRadius: "var(--radius-md)", padding: "28px 16px", gap: 8, cursor: "pointer", transition: "all .2s",
              }}
            >
              <Video size={28} color="var(--text-muted)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Arrastrá tu video acá</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>o hacé click para seleccionar</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>MP4, MOV o AVI · Máx. 200MB</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
