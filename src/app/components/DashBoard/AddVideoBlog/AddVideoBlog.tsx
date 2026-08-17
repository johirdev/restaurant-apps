/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * VideoBlog
 * -------------------------------
 * Restaurant blog/video showcase. Admin pastes a normal video link
 * (YouTube watch/shorts/short-link, Facebook video/reel/fb.watch,
 * Vimeo, TikTok, Instagram reel/post, Dailymotion) and it's converted
 * automatically into a proper <iframe>-embeddable URL, with a live
 * preview right in the form — no manual "get embed code" step needed.
 *
 * Expected API (adjust to match your backend):
 *   GET    /api/v1/video-blogs        -> { success, data: VideoBlog[] }
 *   POST   /api/v1/video-blogs        -> create
 *   PATCH  /api/v1/video-blogs/:id    -> update
 *   DELETE /api/v1/video-blogs/:id    -> handled by DeleteModal
 *   POST   /api/v1/upload             -> { url, public_id } (optional custom thumbnail)
 *   DELETE /api/v1/upload             -> { public_id }
 *
 * Adjust the import paths below to match your project structure.
 */

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage"; // 👈 adjust path
import { toast } from "react-toastify";

type Platform =
  | "youtube"
  | "facebook"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "dailymotion"
  | "other";
type Status = "active" | "inactive";

interface VideoBlog {
  _id: string;
  video_url: string;
  embed_url: string;
  platform: Platform;
  thumbnail?: string;
  thumbnail_public_id?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  status?: Status;
  createdAt?: string;
  [key: string]: any;
}

interface FormData {
  video_url: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnail_public_id: string;
  sort_order: string;
  status: Status;
}

interface FormErrors {
  video_url?: string;
}

const EMPTY_FORM: FormData = {
  video_url: "",
  title: "",
  description: "",
  thumbnail: "",
  thumbnail_public_id: "",
  sort_order: "0",
  status: "active",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  instagram: "Instagram",
  dailymotion: "Dailymotion",
  other: "Other",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: "#FF0000",
  facebook: "#1877F2",
  vimeo: "#1AB7EA",
  tiktok: "#111827",
  instagram: "#C13584",
  dailymotion: "#00AAFF",
  other: "#64748B",
};

/**
 * Turns any normal video link into an iframe-embeddable URL.
 * Returns null when the URL is empty or unrecognized-and-unusable.
 */
function parseVideoUrl(
  rawUrl: string,
): { platform: Platform; embedUrl: string; thumbnail: string } | null {
  const url = rawUrl.trim();
  if (!url) return null;

  try {
    // ---------- YouTube ----------
    const yt = url.match(
      /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
    );
    if (yt) {
      const id = yt[1];
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      };
    }

    // ---------- Vimeo ----------
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
      return {
        platform: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`,
        thumbnail: "",
      };
    }

    // ---------- TikTok ----------
    const tiktok = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    if (tiktok) {
      return {
        platform: "tiktok",
        embedUrl: `https://www.tiktok.com/embed/v2/${tiktok[1]}`,
        thumbnail: "",
      };
    }

    // ---------- Instagram (reel or post) ----------
    const instagram = url.match(
      /instagram\.com\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/,
    );
    if (instagram) {
      return {
        platform: "instagram",
        embedUrl: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed`,
        thumbnail: "",
      };
    }

    // ---------- Dailymotion ----------
    const dailymotion = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dailymotion) {
      return {
        platform: "dailymotion",
        embedUrl: `https://www.dailymotion.com/embed/video/${dailymotion[1]}`,
        thumbnail: "",
      };
    }

    // ---------- Facebook (video, reel, watch, or fb.watch short link) ----------
    if (
      /facebook\.com\/.*\/videos\/|facebook\.com\/watch\/?\?v=|facebook\.com\/reel\/|fb\.watch\//.test(
        url,
      )
    ) {
      return {
        platform: "facebook",
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
        thumbnail: "",
      };
    }

    // ---------- Fallback: treat as an already-embeddable URL ----------
    if (/^https?:\/\//.test(url)) {
      return { platform: "other", embedUrl: url, thumbnail: "" };
    }

    return null;
  } catch {
    return null;
  }
}

const VideoBlog = () => {
  const { token } = useContext(AuthContext);

  const [videos, setVideos] = useState<VideoBlog[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // live-parsed embed info from whatever is currently typed in video_url
  const parsed = useMemo(() => parseVideoUrl(form.video_url), [form.video_url]);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`/api/v1/video-blogs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load video blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setMode("create");
    setEditingId(null);
    setThumbFile(null);
    setThumbPreview("");
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const startEdit = (video: VideoBlog) => {
    setForm({
      video_url: video.video_url || "",
      title: video.title || "",
      description: video.description || "",
      thumbnail: video.thumbnail || "",
      thumbnail_public_id: video.thumbnail_public_id || "",
      sort_order: String(video.sort_order ?? 0),
      status: video.status || "active",
    });
    setErrors({});
    setThumbFile(null);
    setThumbPreview("");
    setMode("edit");
    setEditingId(video._id);
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "video_url" && errors.video_url) {
      setErrors((prev) => ({ ...prev, video_url: undefined }));
    }
  };

  const handleThumbPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 450,
        maxSizeKB: 250,
      });
      setThumbFile(compressed);
      setThumbPreview(URL.createObjectURL(compressed));
    } catch {
      setThumbFile(file);
      setThumbPreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const deleteOldImage = async (publicId: string) => {
    if (!publicId) return;
    try {
      await axios.delete("/api/v1/upload", { data: { public_id: publicId } });
    } catch (err) {
      console.error("Old thumbnail delete error:", err);
    }
  };

  const clearThumb = async () => {
    if (form.thumbnail_public_id)
      await deleteOldImage(form.thumbnail_public_id);
    setForm((prev) => ({ ...prev, thumbnail: "", thumbnail_public_id: "" }));
    setThumbFile(null);
    setThumbPreview("");
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  const uploadThumb = async (
    file: File | null,
    existingUrl: string,
    existingPublicId: string,
  ): Promise<{ url: string; public_id: string }> => {
    if (!file) return { url: existingUrl, public_id: existingPublicId };
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/api/v1/upload", fd);
    const { url, public_id } = res.data;
    if (mode === "edit" && existingPublicId)
      await deleteOldImage(existingPublicId);
    return { url, public_id };
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.video_url.trim()) errs.video_url = "Paste a video link";
    else if (!parsed) errs.video_url = "Couldn't recognize this video link";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !parsed) return;
    setSubmitting(true);
    setUploadingThumb(true);
    try {
      // custom thumbnail takes priority; otherwise fall back to whatever
      // the platform auto-derived (e.g. YouTube's own thumbnail URL)
      const thumbResult = await uploadThumb(
        thumbFile,
        form.thumbnail,
        form.thumbnail_public_id,
      );
      const finalThumbnail = thumbResult.url || parsed.thumbnail;

      const payload = {
        ...form,
        video_url: form.video_url.trim(),
        embed_url: parsed.embedUrl,
        platform: parsed.platform,
        thumbnail: finalThumbnail,
        thumbnail_public_id: thumbResult.public_id,
        sort_order: Number(form.sort_order) || 0,
      };

      if (mode === "create") {
        const res = await axios.post(`/api/v1/video-blogs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Video blog added!");
          resetForm();
          fetchVideos();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(
          `/api/v1/video-blogs/${editingId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.data.success) {
          toast.success("Video blog updated!");
          resetForm();
          fetchVideos();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save video blog.");
    } finally {
      setSubmitting(false);
      setUploadingThumb(false);
    }
  };

  const toggleStatus = async (video: VideoBlog) => {
    const nextStatus: Status =
      video.status === "active" ? "inactive" : "active";
    try {
      const res = await axios.patch(
        `/api/v1/video-blogs/${video._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setVideos((prev) =>
          prev.map((v) =>
            v._id === video._id ? { ...v, status: nextStatus } : v,
          ),
        );
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = (): void => {
    if (!deleteId) return;
    setVideos((prev) => prev.filter((v) => v._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const previewThumb = thumbFile
    ? thumbPreview
    : form.thumbnail || parsed?.thumbnail || "";

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/video-blogs/${deleteId}`}
          title="Video"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* Mobile header + toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Video Blog</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Video"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ============== LEFT: FORM ============== */}
        <div
          className={`${formOpen ? "block" : "hidden"} lg:block bg-card border-default rounded-xl overflow-hidden lg:sticky lg:top-6`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-default-b">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-blue-soft)" }}
            >
              <svg
                className="w-5 h-5 text-highlight"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path
                  d="M10 9.5v5l4.5-2.5-4.5-2.5Z"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Video Blog" : "Edit Video Blog"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                Paste any YouTube, Facebook, Vimeo, TikTok or Instagram link.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Video URL */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Video Link <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.video_url}
                onChange={(e) => handleChange("video_url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`input-field w-full h-10 px-3 text-[13px] ${errors.video_url ? "input-error" : ""}`}
              />
              {errors.video_url && (
                <p className="text-[12px] text-danger">{errors.video_url}</p>
              )}
              {parsed && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                  style={{ background: PLATFORM_COLOR[parsed.platform] }}
                >
                  {PLATFORM_LABEL[parsed.platform]} detected
                </span>
              )}
            </div>

            {/* Live embed preview */}
            <div className="space-y-1.5">
              <p className="text-[12px] text-secondary">Preview</p>
              <div
                className="relative w-full aspect-video rounded-lg overflow-hidden border-default flex items-center justify-center"
                style={{ background: "var(--bg-elevated)" }}
              >
                {parsed ? (
                  <iframe
                    src={parsed.embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    title="Video preview"
                  />
                ) : (
                  <p className="text-[12px] text-muted px-4 text-center">
                    Paste a video link above to preview it here
                  </p>
                )}
              </div>
              {parsed?.platform === "facebook" && (
                <p className="text-[11px] text-muted">
                  Facebook embeds only render for public videos, and may not
                  preview inside every dev/sandbox environment — it will still
                  work correctly on your live site.
                </p>
              )}
            </div>

            {/* Custom thumbnail (optional) */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Custom Thumbnail{" "}
                <span className="text-muted">
                  (optional — auto-used for YouTube otherwise)
                </span>
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-12 rounded-md border-default flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: "var(--bg-input)" }}
                >
                  {previewThumb ? (
                    <img
                      src={previewThumb}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-5 h-5 text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbPick}
                    disabled={compressing}
                    className="input-field w-full text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:text-highlight"
                  />
                  <div className="flex items-center gap-2">
                    {compressing && (
                      <span className="text-[11px] text-secondary">
                        Optimizing…
                      </span>
                    )}
                    {previewThumb && !compressing && form.thumbnail && (
                      <button
                        type="button"
                        onClick={clearThumb}
                        className="text-[11px] text-danger hover:underline"
                      >
                        Remove custom thumbnail
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Title <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Behind the scenes: our kitchen"
                className="input-field w-full h-10 px-3 text-[14px]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Description <span className="text-muted">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="A short blurb about this video..."
                rows={3}
                className="input-field w-full px-3 py-2 text-[13px] resize-none"
              />
            </div>

            {/* Order + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange("sort_order", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                >
                  <option value="active" className="bg-elevated text-primary">
                    Active
                  </option>
                  <option value="inactive" className="bg-elevated text-primary">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-outline px-5 py-2 text-[13px]"
            >
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingThumb || compressing || !parsed}
              className="btn btn-primary flex items-center gap-2 px-6 py-2 text-[13px]"
            >
              {submitting
                ? uploadingThumb
                  ? "Uploading..."
                  : mode === "create"
                    ? "Adding..."
                    : "Updating..."
                : mode === "create"
                  ? "Add Video"
                  : "Update Video"}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: VIDEO GRID ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden p-4 md:p-5">
          {loading ? (
            <p className="text-secondary text-sm p-2">Loading...</p>
          ) : videos.length === 0 ? (
            <p className="text-secondary text-sm p-2">
              No videos yet. Paste a link to add your first one.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((video) => (
                  <div
                    key={video._id}
                    className={`bg-elevated border-default rounded-lg overflow-hidden flex flex-col ${
                      editingId === video._id ? "outline outline-1" : ""
                    }`}
                    style={
                      editingId === video._id
                        ? { outlineColor: "var(--accent-blue)" }
                        : undefined
                    }
                  >
                    <div
                      className="relative w-full aspect-video"
                      style={{ background: "var(--bg-input)" }}
                    >
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title || ""}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            className="text-muted"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="16"
                              rx="2"
                              strokeWidth={1.5}
                            />
                            <path
                              d="M10 9.5v5l4.5-2.5-4.5-2.5Z"
                              fill="currentColor"
                              stroke="none"
                            />
                          </svg>
                        </div>
                      )}
                      <span
                        className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                        style={{ background: PLATFORM_COLOR[video.platform] }}
                      >
                        {PLATFORM_LABEL[video.platform]}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M8 5v14l11-7L8 5Z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 flex flex-col gap-2 flex-1">
                      <p className="text-[13px] font-medium text-primary truncate">
                        {video.title || "Untitled video"}
                      </p>
                      {video.description && (
                        <p className="text-[11px] text-secondary line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleStatus(video)}
                        className={`self-start px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          video.status === "active"
                            ? "text-success"
                            : "text-danger"
                        }`}
                        style={{
                          borderColor: "var(--border-color)",
                          background:
                            video.status === "active"
                              ? "var(--accent-green-soft)"
                              : "rgba(239,68,68,0.12)",
                        }}
                      >
                        {video.status === "active" ? "Active" : "Inactive"}
                      </button>

                      <div className="flex gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={() => startEdit(video)}
                          className="btn btn-blue flex-1 py-1.5 text-[11px]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalOpen(true);
                            setDeleteId(video._id);
                          }}
                          className="btn btn-danger flex-1 py-1.5 text-[11px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoBlog;
