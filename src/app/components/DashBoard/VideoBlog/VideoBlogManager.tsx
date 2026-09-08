/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * VideoBlogManager — হোম পেজের ভিডিও ব্লগ
 * --------------------------------------------------------------------------
 * অ্যাডমিন শুধু YouTube / Facebook / TikTok এর লিংকটা পেস্ট করেন —
 * প্ল্যাটফর্ম, ভিডিও আইডি আর embed লিংক সার্ভার নিজেই বের করে নেয়।
 *
 * ডানের প্রিভিউটা সাইটের আসল <VideoCard /> দিয়েই আঁকা, তাই এখানে যেমন
 * দেখাচ্ছে হোম পেজেও ঠিক তেমনই যাবে।
 *
 *   GET    /api/v1/videos       → তালিকা (ম্যানেজমেন্ট)
 *   POST   /api/v1/videos       → নতুন
 *   PATCH  /api/v1/videos/:id   → বদল
 *   DELETE /api/v1/videos/:id   → মুছে ফেলা (DeleteModal করে)
 */

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { deleteImage, uploadImage } from "@/src/lib/upload";
import { PROVIDER_LABEL, parseVideoUrl } from "@/src/lib/videoUrl";
import {
  ProviderIcon,
  VideoCard,
  type VideoBlogItem,
} from "@/src/app/components/Clients/VideoBlog/VideoBlog";

type Status = "active" | "inactive";

interface FormState {
  title: string;
  description: string;
  video_url: string;
  thumbnail: string;
  thumbnail_public_id: string;
  duration: string;
  sort_order: string;
  status: Status;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  video_url: "",
  thumbnail: "",
  thumbnail_public_id: "",
  duration: "",
  sort_order: "0",
  status: "active",
};

const VideoBlogManager = () => {
  const { token } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [videos, setVideos] = useState<VideoBlogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ title?: string; video_url?: string }>({});

  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------------------------- LOAD */
  const fetchVideos = async () => {
    try {
      const res = await axios.get("/api/v1/videos", authHeader);
      setVideos(res.data?.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load videos"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------- লিংকটা কী বলছে ------- */
  // টাইপ করার সাথে সাথেই প্ল্যাটফর্ম আর অটো-থাম্বনেইল বেরিয়ে আসে
  const parsed = useMemo(
    () => (form.video_url.trim() ? parseVideoUrl(form.video_url) : null),
    [form.video_url],
  );

  const urlTouched = form.video_url.trim().length > 0;
  const linkUnknown = urlTouched && !parsed;
  /** Facebook / TikTok নিজে থেকে ছবি দেয় না — অ্যাডমিনকেই দিতে হয় */
  const needsThumbnail =
    !!parsed && !parsed.thumbnail && !form.thumbnail && !imageFile;

  /* ---------------------------------------------------------------- FORM */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setMode("create");
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (video: VideoBlogItem) => {
    setForm({
      title: video.title || "",
      description: video.description || "",
      video_url: video.video_url || "",
      thumbnail: video.thumbnail || "",
      thumbnail_public_id:
        (video as { thumbnail_public_id?: string }).thumbnail_public_id || "",
      duration: video.duration || "",
      sort_order: String(video.sort_order ?? 0),
      status: (video.status as Status) || "active",
    });
    setErrors({});
    setImageFile(null);
    setImagePreview("");
    setMode("edit");
    setEditingId(video._id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /* --------------------------------------------------------------- IMAGE */
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setCompressing(true);
    try {
      // কার্ডের থাম্বনেইল — 1280x720 এর বেশি লাগে না
      const compressed = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 720,
        maxSizeKB: 300,
      });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const clearImage = async () => {
    if (form.thumbnail_public_id) await deleteImage(form.thumbnail_public_id);
    setForm((prev) => ({ ...prev, thumbnail: "", thumbnail_public_id: "" }));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------------------------------------------------------------- SAVE */
  const handleSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = "Video title is required";
    if (!form.video_url.trim()) nextErrors.video_url = "Video link is required";
    else if (!parsed) {
      nextErrors.video_url =
        "Paste a full YouTube, Facebook or TikTok video link";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      let thumbnail = form.thumbnail;
      let thumbnailPublicId = form.thumbnail_public_id;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile, "videos");
        if (thumbnailPublicId && thumbnailPublicId !== uploaded.public_id) {
          await deleteImage(thumbnailPublicId);
        }
        thumbnail = uploaded.url;
        thumbnailPublicId = uploaded.public_id;
      }

      // provider / video_id / embed_url সার্ভার নিজে বসায় — এখান থেকে পাঠাই না
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        video_url: form.video_url.trim(),
        thumbnail,
        thumbnail_public_id: thumbnailPublicId,
        duration: form.duration.trim(),
        sort_order: Number(form.sort_order) || 0,
        status: form.status,
      };

      if (mode === "create") {
        await axios.post("/api/v1/videos", payload, authHeader);
        toast.success("Video added successfully!");
      } else {
        await axios.patch(`/api/v1/videos/${editingId}`, payload, authHeader);
        toast.success("Video updated successfully!");
      }

      resetForm();
      setFormOpen(false);
      fetchVideos();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save video"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (video: VideoBlogItem) => {
    const next: Status = video.status === "active" ? "inactive" : "active";
    try {
      await axios.patch(
        `/api/v1/videos/${video._id}`,
        { status: next },
        authHeader,
      );
      setVideos((prev) =>
        prev.map((v) => (v._id === video._id ? { ...v, status: next } : v)),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status"));
    }
  };

  /* -------------------------------------------------------------- DELETE */
  const closeDeleteModal = () => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = () => {
    if (!deleteId) return;
    setVideos((prev) => prev.filter((v) => v._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  /* ------------------------------------------------------------- PREVIEW */
  const previewVideo: VideoBlogItem = {
    _id: "preview",
    title: form.title || "Your video title",
    description: form.description,
    video_url: form.video_url,
    provider: parsed?.provider,
    embed_url: parsed?.embed_url,
    thumbnail: imageFile ? imagePreview : form.thumbnail,
    duration: form.duration,
  };

  const activeCount = videos.filter((v) => v.status === "active").length;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/videos/${deleteId}`}
          title="Video"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* ---------- মোবাইল হেডার ---------- */}
      <div className="mb-4 flex items-center justify-between xl:hidden">
        <h1 className="text-lg font-semibold text-primary">Video blog</h1>
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

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_1fr]">
        {/* ================= LEFT: FORM ================= */}
        <div
          className={`${formOpen ? "block" : "hidden"} bg-card border-default overflow-hidden rounded-xl xl:sticky xl:top-6 xl:block`}
        >
          <div className="border-default-b flex items-center gap-4 px-6 py-5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-red-soft)" }}
            >
              <ProviderIcon
                provider={parsed?.provider}
                className="h-5 w-5 text-danger"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Video" : "Edit Video"}
              </h2>
              <p className="mt-0.5 text-[13px] text-secondary">
                Paste a link — we work out the rest.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {/* ---- Video link ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Video link <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.video_url}
                onChange={(e) => set("video_url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className={`input-field h-10 w-full px-3 text-[13px] ${errors.video_url || linkUnknown ? "input-error" : ""}`}
              />

              {parsed ? (
                <p className="flex items-center gap-1.5 text-[12px] text-success">
                  <ProviderIcon provider={parsed.provider} className="h-3 w-3" />
                  {PROVIDER_LABEL[parsed.provider]} video detected
                  {parsed.video_id ? ` · ${parsed.video_id}` : ""}
                </p>
              ) : null}

              {linkUnknown ? (
                <p className="text-[12px] text-danger">
                  Not a link we recognise. Use a full YouTube, Facebook or
                  TikTok video URL — short TikTok links (vm.tiktok.com/…) do not
                  work, open the video and copy from the address bar.
                </p>
              ) : null}

              {errors.video_url && !linkUnknown ? (
                <p className="text-[12px] text-danger">{errors.video_url}</p>
              ) : null}

              {!urlTouched ? (
                <p className="text-[11px] text-muted">
                  YouTube (watch / shorts / youtu.be), Facebook (video / reel)
                  and TikTok links all work.
                </p>
              ) : null}
            </div>

            {/* ---- Title ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="How we make our Kacchi Biryani"
                className={`input-field h-10 w-full px-3 text-[13px] ${errors.title ? "input-error" : ""}`}
              />
              {errors.title && (
                <p className="text-[12px] text-danger">{errors.title}</p>
              )}
            </div>

            {/* ---- Description ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Short description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Behind the scenes in our kitchen"
                className="input-field w-full px-3 py-2 text-[13px]"
              />
            </div>

            {/* ---- Thumbnail ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Thumbnail{" "}
                <span className="text-muted">
                  {parsed?.thumbnail ? "(optional)" : "(recommended)"}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="border-default flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{ background: "var(--bg-input)" }}
                >
                  {imageFile || form.thumbnail || parsed?.thumbnail ? (
                    <img
                      src={
                        imageFile
                          ? imagePreview
                          : form.thumbnail || parsed?.thumbnail
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">No image</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePick}
                    disabled={compressing}
                    className="input-field w-full text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:px-3 file:py-1.5 file:text-highlight"
                  />
                  {compressing && (
                    <span className="text-[11px] text-secondary">
                      Optimizing image…
                    </span>
                  )}
                  {(imageFile || form.thumbnail) && !compressing && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-[11px] text-danger hover:underline"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>

              {parsed?.thumbnail ? (
                <p className="text-[11px] text-muted">
                  YouTube gives us a thumbnail automatically — upload one only
                  to override it.
                </p>
              ) : null}

              {needsThumbnail ? (
                <p className="text-[11px] text-danger">
                  {PROVIDER_LABEL[parsed.provider]} does not give us a preview
                  image. Without one the card shows a plain gradient.
                </p>
              ) : null}
            </div>

            {/* ---- Duration + order ---- */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Duration <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="2:45"
                  className="input-field h-10 w-full px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Slide order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                  className="input-field h-10 w-full px-3 text-[13px]"
                />
              </div>
            </div>

            {/* ---- Status ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as Status)}
                className="input-field h-10 w-full px-3 text-[13px]"
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

          <div className="border-default-t flex items-center justify-between px-6 py-4">
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
              disabled={submitting || compressing}
              className="btn btn-primary px-6 py-2 text-[13px]"
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Add Video"
                  : "Update Video"}
            </button>
          </div>
        </div>

        {/* ================= RIGHT: PREVIEW + LIST ================= */}
        <div className="space-y-6">
          {/* ---- Live preview ---- */}
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h3 className="text-[14px] font-medium text-primary">
                Card preview
              </h3>
              <p className="text-[12px] text-secondary">
                Exactly how the card looks on the home page.
              </p>
            </div>
            <div className="p-5" style={{ background: "var(--bg-elevated)" }}>
              <div className="max-w-[340px]">
                <VideoCard video={previewVideo} />
              </div>
            </div>
          </div>

          {/* ---- List ---- */}
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h3 className="text-[14px] font-medium text-primary">
                All videos{" "}
                <span className="text-secondary">({videos.length})</span>
              </h3>
              <p className="text-[12px] text-secondary">
                {activeCount > 0
                  ? `${activeCount} active — they scroll continuously on the home page.`
                  : "Nothing active — the home page hides the video section."}
              </p>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <p className="p-2 text-sm text-secondary">Loading…</p>
              ) : videos.length === 0 ? (
                <p className="p-2 text-sm text-secondary">
                  No videos yet. Paste your first link on the left.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {videos.map((video) => (
                    <div
                      key={video._id}
                      className={`bg-elevated border-default flex flex-col overflow-hidden rounded-lg ${
                        editingId === video._id ? "outline outline-1" : ""
                      }`}
                      style={
                        editingId === video._id
                          ? { outlineColor: "var(--accent-blue)" }
                          : undefined
                      }
                    >
                      <VideoCard video={video} />

                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="clamp-1 text-[11px] text-highlight hover:underline"
                        >
                          {video.video_url}
                        </a>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(video)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                              video.status === "active"
                                ? "text-success"
                                : "text-danger"
                            }`}
                            style={{
                              borderColor: "var(--border-color)",
                              background:
                                video.status === "active"
                                  ? "var(--accent-green-soft)"
                                  : "var(--accent-red-soft)",
                            }}
                          >
                            {video.status === "active" ? "Active" : "Inactive"}
                          </button>
                          <span className="text-[10px] text-muted">
                            #{video.sort_order ?? 0}
                          </span>
                        </div>

                        <div className="mt-auto flex gap-2">
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
      </div>
    </div>
  );
};

export default VideoBlogManager;
