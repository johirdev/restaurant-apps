/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ImageOff,
  Loader2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

/* ==========================================================================
   IMAGE CROPPER — প্রোফাইল ছবি একটাই মাপে কেটে নেওয়া
   --------------------------------------------------------------------------
   কেন দরকার: মানুষ যা খুশি মাপের ছবি দেয় — লম্বা, চওড়া, ১২ মেগাপিক্সেল।
   সেটা সোজা আপলোড করলে অ্যাভাটারের গোল ঘরে মাথা কেটে যায়, আর অকারণে
   বড় ফাইল Cloudinary তে জমে। তাই আপলোডের আগেই ছবিটা এখানে বর্গাকারে
   কেটে, একটা নির্দিষ্ট মাপে (OUTPUT_SIZE) নামিয়ে নেওয়া হয়।

   গণিতটা সরল:
     baseScale — ছবিটা বর্গাকার ঘরটা ঠিক ঢাকতে যতটুকু বড়/ছোট করতে হয়
     scale     — baseScale × ব্যবহারকারীর জুম
     offset    — ছবির উপরের-বাঁ কোণ ঘরের সাপেক্ষে কোথায় (টেনে সরানো হয়)

   অফসেটটা সবসময় এমনভাবে আটকে রাখা হয় যাতে ঘরের কোনো কোণ কখনো ফাঁকা
   না থাকে — তাই কাটা ছবিতে সাদা পট্টি আসার কোনো সুযোগ নেই।

   কোনো লাইব্রেরি লাগে না — ক্যানভাসই যথেষ্ট, আর বান্ডলও ভারী হয় না।

   ⚠ blob: URL এর আয়ু —
   অবজেক্ট URL টা তৈরি আর বাতিল দুটোই এখন একই effect এ। আগে এটা
   useMemo এ তৈরি হয়ে আলাদা effect এ বাতিল হতো; React এর StrictMode
   ডেভেলপমেন্টে effect একবার চালিয়ে, cleanup ডেকে, আবার চালায় — ফলে
   URL টা কাজে লাগার আগেই বাতিল হয়ে যেত আর বাছাই করা ছবিটা কখনো
   দেখাই যেত না। একসাথে রাখায় প্রতিবার নতুন URL হাতে থাকে।
   ========================================================================== */

/** কাটা ছবিটা এই মাপে সেভ হয় — রেটিনাতেও ঝকঝকে, অথচ ফাইল ছোট */
const OUTPUT_SIZE = 512;
/** পর্দায় কাটার ঘরটা কত বড় দেখাবে */
const VIEW = 280;
/** পাশের ছোট গোল প্রিভিউ — অ্যাভাটারে ঠিক যেমন দেখাবে */
const PREVIEW = 64;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
/** কীবোর্ডের তীর চাপলে কত পিক্সেল সরবে */
const NUDGE_PX = 8;

type Point = { x: number; y: number };

interface ImageCropperProps {
  /** যে ফাইলটা কাটা হবে */
  file: File;
  title?: string;
  /** কাটা শেষে নতুন ফাইলটা এখানে যায় — কলার তখন আপলোড করে */
  onCropped: (file: File) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  file,
  title = "Adjust your photo",
  onCropped,
  onCancel,
}: ImageCropperProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  /** ছবিটা পড়া গেছে কিনা — না গেলে ভাঙা ফাইলের কথা বলে দিই */
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  /**
   * ছবির কোন বিন্দুটা ঘরের ঠিক মাঝখানে আছে — ছবির নিজের অনুপাতে (০–১)।
   *
   * পিক্সেলে অফসেট না রেখে এভাবে রাখার দুটো লাভ: জুম করলে যে জায়গাটা
   * দেখছিলেন সেটাই মাঝখানে থাকে (কেন্দ্রে ফিরে যায় না), আর জুম বদলালে
   * অফসেট নতুন করে হিসাব করার জন্য কোনো effect লাগে না — অফসেটটা
   * এখান থেকেই বেরিয়ে আসে।
   */
  const [center, setCenter] = useState<Point>({ x: 0.5, y: 0.5 });
  const [saving, setSaving] = useState(false);

  /* একসাথে যতগুলো আঙুল/পয়েন্টার ঘরটার উপরে আছে — চিমটি (pinch) ধরার জন্য */
  const pointers = useRef(new Map<number, Point>());
  /* টানার সময়ের হিসাব — প্রতি ফ্রেমে state এ লিখলে কাঁপত, তাই ref */
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  /* চিমটির শুরুতে দুই আঙুলের দূরত্ব আর তখনকার জুম */
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /* ---------------- ফাইল → ছবি ----------------
     URL তৈরি, ছবি পড়া আর URL বাতিল — তিনটেই একই effect এ, তাই
     StrictMode এর দ্বিতীয় দফাতেও নতুন একটা URL হাতে থাকে। */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    let alive = true;

    setImage(null);
    setFailed(false);
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      // ০×০ মানে ফাইলটা আসলে ছবি নয়, শুধু নামটাই .jpg
      if (!img.naturalWidth || !img.naturalHeight) setFailed(true);
      else setImage(img);
    };
    img.onerror = () => {
      if (alive) setFailed(true);
    };
    img.src = url;

    return () => {
      alive = false;
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /** ছবিটা ঘরটা ঠিক ঢাকতে যতটুকু স্কেল লাগে */
  const baseScale = image
    ? Math.max(VIEW / image.naturalWidth, VIEW / image.naturalHeight)
    : 1;
  const scale = baseScale * zoom;
  const width = image ? image.naturalWidth * scale : 0;
  const height = image ? image.naturalHeight * scale : 0;

  /** অফসেটটা এমন সীমায় রাখি যাতে ঘরের কোনো কোণ ফাঁকা না থাকে */
  const fit = useCallback(
    (value: number, size: number) => Math.min(0, Math.max(VIEW - size, value)),
    [],
  );

  /**
   * ছবির উপরের-বাঁ কোণ ঘরের সাপেক্ষে কোথায় বসবে।
   * জুম বদলালে `center` সীমার বাইরে চলে যেতে পারে, তাই আঁকার আগে
   * এখানেই আরেকবার আটকে নেওয়া হয় — কোনো effect ছাড়াই ঠিক হয়ে যায়।
   */
  const offset = useMemo(() => {
    if (!image) return { x: 0, y: 0 };
    return {
      x: fit(VIEW / 2 - center.x * width, width),
      y: fit(VIEW / 2 - center.y * height, height),
    };
  }, [image, center, width, height, fit]);

  /** পিক্সেলে বসানো অফসেটটা সীমায় এনে আবার ছবির অনুপাতে ফিরিয়ে রাখি */
  const moveTo = useCallback(
    (x: number, y: number) => {
      if (!width || !height) return;
      setCenter({
        x: (VIEW / 2 - fit(x, width)) / width,
        y: (VIEW / 2 - fit(y, height)) / height,
      });
    },
    [width, height, fit],
  );

  /**
   * জুম বদলাও, কিন্তু পর্দার একটা বিন্দু জায়গামতোই থাকুক।
   * `anchor` না দিলে ঘরের মাঝখানটাই ধরে রাখা হয় — স্লাইডার/বোতামে সেটাই স্বাভাবিক।
   */
  const zoomTo = useCallback(
    (next: number, anchor?: Point) => {
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      setZoom(target);

      if (!image || !anchor || !width || !height) return;

      // আঙুলের নিচে ছবির যে বিন্দুটা ছিল
      const ix = (anchor.x - offset.x) / width;
      const iy = (anchor.y - offset.y) / height;
      // জুমের পরেও সেই বিন্দুটাই যেন ওখানে থাকে
      const nw = image.naturalWidth * baseScale * target;
      const nh = image.naturalHeight * baseScale * target;

      setCenter({
        x: ix + (VIEW / 2 - anchor.x) / nw,
        y: iy + (VIEW / 2 - anchor.y) / nh,
      });
    },
    [image, width, height, offset, baseScale],
  );

  /* Escape চাপলে বন্ধ, আর খোলা থাকতে পেছনের পাতা স্ক্রল করবে না */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel]);

  /* ---------------- টেনে সরানো + চিমটিতে জুম ---------------- */
  /** পয়েন্টারটা ঘরটার ভেতরে কোথায় (ঘরের বাঁ-উপর কোণ থেকে) */
  const localPoint = (clientX: number, clientY: number): Point => {
    const box = boxRef.current?.getBoundingClientRect();
    return box
      ? { x: clientX - box.left, y: clientY - box.top }
      : { x: VIEW / 2, y: VIEW / 2 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!image) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // দ্বিতীয় আঙুল নামল — এখন থেকে টানা নয়, চিমটি
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.distance > 0) {
        zoomTo(
          pinch.current.zoom * (distance / pinch.current.distance),
          localPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
        );
      }
      return;
    }

    if (!drag.current) return;
    moveTo(
      drag.current.ox + (e.clientX - drag.current.x),
      drag.current.oy + (e.clientY - drag.current.y),
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) pinch.current = null;
    // একটা আঙুল উঠে গেলে বাকিটা দিয়ে আবার টানা শুরু হোক
    if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      drag.current = { x: only.x, y: only.y, ox: offset.x, oy: offset.y };
    } else {
      drag.current = null;
    }
  };

  /* চাকা ঘোরালে জুম — কার্সরের নিচের জায়গাটাই ধরে রাখে।
     onWheel prop দিলে React সেটা passive হিসেবে বসায়, তখন
     preventDefault() কাজ করে না আর পেছনের পাতা স্ক্রল করে ফেলে —
     তাই হাতে { passive: false } দিয়ে বসাতে হয়। */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !image) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      zoomTo(zoom - e.deltaY * 0.002, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [image, zoom, zoomTo]);

  /* তীর চিহ্নে ছবিটা একটু একটু করে সরানো — মাউস ছাড়াও যেন ঠিক করা যায় */
  const onBoxKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, Point> = {
      ArrowLeft: { x: -NUDGE_PX, y: 0 },
      ArrowRight: { x: NUDGE_PX, y: 0 },
      ArrowUp: { x: 0, y: -NUDGE_PX },
      ArrowDown: { x: 0, y: NUDGE_PX },
    };
    const move = step[e.key];
    if (move) {
      e.preventDefault();
      moveTo(offset.x + move.x, offset.y + move.y);
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomTo(zoom + 0.2);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomTo(zoom - 0.2);
    }
  };

  const reset = () => {
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });
  };

  /* ---------------- কেটে ফাইল বানানো ---------------- */
  const apply = async () => {
    if (!image) return;
    setSaving(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare the image");

      // JPEG এ স্বচ্ছতা নেই — সাদা না বসালে PNG এর ফাঁকা অংশ কালো হয়ে যেত
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.imageSmoothingQuality = "high";

      // পর্দার ঘরটা ছবির কোন অংশ দেখাচ্ছে — সেটাই উৎসের স্থানাঙ্কে
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const size = VIEW / scale;

      ctx.drawImage(image, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not prepare the image");

      onCropped(
        new File([blob], "profile.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  /** পাশের ছোট প্রিভিউ — বড় ঘরটারই হুবহু ছোট নকল */
  const previewRatio = PREVIEW / VIEW;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* পেছনের পর্দা — এখানে ক্লিক করলেই বন্ধ */}
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />

      <div className="site-card pop-in relative w-full max-w-[380px] overflow-hidden">
        {/* ---------- হেডার ---------- */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* ---------- কাটার ঘর ---------- */}
          <div
            ref={boxRef}
            role="application"
            aria-label="Drag to reposition, scroll or pinch to zoom"
            tabIndex={image ? 0 : -1}
            className="relative mx-auto touch-none overflow-hidden rounded-md bg-surface-soft select-none focus:ring-2 focus:ring-brand focus:outline-none"
            style={{
              width: VIEW,
              height: VIEW,
              cursor: image ? "grab" : "default",
            }}
            onKeyDown={onBoxKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {image ? (
              /* next/image এখানে চলবে না — এটা ব্রাউজারের ভেতরের অস্থায়ী
                 blob: URL, সার্ভার সেটা অপটিমাইজ করতে পারে না */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{
                  width,
                  height,
                  left: offset.x,
                  top: offset.y,
                }}
              />
            ) : (
              /* ছবিটা পড়া না হওয়া পর্যন্ত ঘরটা ফাঁকা না রেখে অবস্থাটা বলি */
              <div className="absolute inset-0 grid place-items-center text-ink-faint">
                {failed ? (
                  <span className="flex flex-col items-center gap-2 px-6 text-center">
                    <ImageOff size={26} />
                    <span className="text-[12.5px] font-semibold">
                      This file could not be opened as an image.
                    </span>
                  </span>
                ) : (
                  <Loader2 size={24} className="animate-spin text-brand" />
                )}
              </div>
            )}

            {/* গোল মুখোশ — অ্যাভাটারে ছবিটা ঠিক এভাবেই দেখা যাবে */}
            {image && (
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                  boxShadow: "0 0 0 9999px rgba(28,28,40,0.45)",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.85)",
                }}
              />
            )}
          </div>

          {/* ---------- প্রিভিউ + সাহায্যের লাইন ---------- */}
          <div className="mt-3.5 flex items-center gap-3">
            <div
              className="flex-shrink-0 overflow-hidden rounded-full border border-border bg-surface-soft"
              style={{ width: PREVIEW, height: PREVIEW }}
              aria-hidden="true"
            >
              {image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={image.src}
                  alt=""
                  draggable={false}
                  className="max-w-none"
                  style={{
                    width: width * previewRatio,
                    height: height * previewRatio,
                    marginLeft: offset.x * previewRatio,
                    marginTop: offset.y * previewRatio,
                  }}
                />
              )}
            </div>

            <p className="text-[12px] leading-relaxed text-ink-faint">
              <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
                <Move size={13} /> Drag to move
              </span>
              Scroll, pinch or use the slider to zoom. The circle is exactly what
              others will see.
            </p>
          </div>

          {/* ---------- জুম ---------- */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => zoomTo(zoom - 0.2)}
              disabled={!image || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
            >
              <Minus size={15} />
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!image}
              onChange={(e) => zoomTo(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-soft accent-brand disabled:opacity-40"
            />

            <button
              type="button"
              onClick={() => zoomTo(zoom + 0.2)}
              disabled={!image || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-border text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* ---------- বোতাম ---------- */}
        <div className="flex items-center gap-2 border-t border-border bg-canvas px-5 py-3.5">
          <button
            type="button"
            onClick={reset}
            disabled={!image}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-brand disabled:opacity-40"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="site-btn site-btn-outline h-10 px-4 text-[13.5px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!image || saving}
              className="site-btn site-btn-primary h-10 px-5 text-[13.5px]"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Working…
                </>
              ) : (
                <>
                  <Check size={15} /> Use photo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
