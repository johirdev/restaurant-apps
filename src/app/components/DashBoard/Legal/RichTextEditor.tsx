"use client";

/**
 * RichTextEditor — আইনি পাতার লেখা সাজানোর এডিটর
 * --------------------------------------------------------------------------
 * বাইরের কোনো লাইব্রেরি নেই। ব্রাউজারের নিজের `contentEditable` আর
 * `document.execCommand` দিয়েই চলে — তাই বান্ডলে এক বাইটও যোগ হয় না।
 *
 * ম্যানেজার লেখার সময় যা যা বদলাতে পারেন:
 *
 *   অক্ষরে   — বোল্ড, ইটালিক, আন্ডারলাইন, কাটা, ফন্ট সাইজ, রঙ, হাইলাইট
 *   অনুচ্ছেদে — শিরোনাম স্তর, অ্যালাইনমেন্ট, লাইনের ফাঁক, অক্ষরের ফাঁক,
 *              উপরে-নিচের ফাঁক
 *   গঠনে     — বুলেট, নম্বর, উদ্ধৃতি, রেখা, লিংক
 *
 * তিনটে জিনিস ইচ্ছে করে এভাবে করা:
 *
 * ১. কম্পোনেন্টটা uncontrolled — লেখা শুরু হওয়ার পর React আর ভেতরের HTML
 *    ছোঁয় না। ছুঁলে প্রতিটা কি-স্ট্রোকে কার্সার লাফিয়ে শেষে চলে যেত।
 *    অন্য সেকশন বা ভাষায় গেলে প্যারেন্ট `key` বদলে নতুন এডিটর বসায়।
 *
 * ২. পেস্ট সবসময় সাদা লেখা হিসেবে বসে। ওয়ার্ড বা অন্য সাইট থেকে কপি করা
 *    লেখার সাথে মণ-মণ ইনলাইন স্টাইল আসে, সেগুলো পাতার সাজ নষ্ট করত।
 *
 * ৩. `fontSize` কমান্ড পুরোনো `<font size="7">` বসায়। প্রতিবার কমান্ডের
 *    পরেই সেটাকে `<span style="font-size: …">` এ বদলে দেওয়া হয় — কারণ
 *    সার্ভারের sanitizer `<font>` চেনে না, ওটা বাদ পড়ে যেত।
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from "lucide-react";

// লেখার জায়গাটা সাদা "কাগজ", আর তার ভেতরের টাইপোগ্রাফি সাইটের আসল
// স্টাইলশিট থেকেই আসে — তাই এডিটরে যা দেখা যায়, পাতাতেও ঠিক তাই যায়।
import "../../Clients/Legal/legalPage.css";
import "./legalEditor.css";

/* ------------------------------------------------------------------ */
/* টুলবারের পছন্দের তালিকা                                            */
/* ------------------------------------------------------------------ */

const FONT_SIZES = [
  "12px",
  "13px",
  "14px",
  "15px",
  "16px",
  "18px",
  "20px",
  "22px",
  "24px",
  "28px",
  "32px",
  "36px",
];

const LINE_HEIGHTS = ["1.3", "1.5", "1.65", "1.8", "1.95", "2.1", "2.4"];

const LETTER_SPACINGS = ["normal", "0.01em", "0.02em", "0.04em", "0.06em"];

const BLOCK_SPACINGS = ["0", "6px", "12px", "18px", "24px", "36px"];

/** লেখার রঙ — সাইটের টোকেনের সাথে মিলিয়ে রাখা */
const TEXT_COLORS = [
  { label: "Ink", value: "#1c1c28" },
  { label: "Soft", value: "#5f5f70" },
  { label: "Faint", value: "#9797a8" },
  { label: "Brand", value: "#d70f64" },
  { label: "Green", value: "#189b4c" },
  { label: "Red", value: "#e23c34" },
  { label: "Amber", value: "#d99c1d" },
  { label: "Blue", value: "#2563eb" },
];

/** হাইলাইটের রঙ — হালকা, লেখা যেন পড়া যায় */
const HIGHLIGHT_COLORS = [
  { label: "None", value: "transparent" },
  { label: "Yellow", value: "#fff5e0" },
  { label: "Pink", value: "#ffe6f0" },
  { label: "Green", value: "#e6f6ec" },
  { label: "Blue", value: "#e8f0fe" },
  { label: "Grey", value: "#f2f2f5" },
];

/** যে ট্যাগগুলোকে "একটা অনুচ্ছেদ" ধরা হয় — ফাঁক আর অ্যালাইনমেন্ট এদের উপরে বসে */
const BLOCK_SELECTOR = "p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th";

/* ------------------------------------------------------------------ */
/* টুলবারের টুকরো                                                      */
/* --------------------------------------------------------------------
   দুটোই মডিউল স্তরে — কম্পোনেন্টের ভেতরে লিখলে প্রতিটা রেন্ডারে নতুন
   কম্পোনেন্ট তৈরি হতো, React পুরো সাবট্রি খুলে আবার বসাত, আর লিংকের
   ইনপুট বক্সটা প্রতিটা অক্ষরে ফোকাস হারাত।
   ------------------------------------------------------------------ */

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  isActive?: boolean;
}

const ToolButton = ({ icon: Icon, title, onClick, isActive }: ToolButtonProps) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={isActive}
    // onMouseDown এ preventDefault না করলে বোতামে ক্লিকের সাথে সাথেই
    // এডিটরের সিলেকশন মুছে যায়, তারপর কমান্ডটা কিছুই পায় না
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`rte-btn${isActive ? " is-active" : ""}`}
  >
    <Icon className="rte-btn__icon" />
  </button>
);

interface ToolMenuProps {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  openMenu: string | null;
  onToggle: (name: string) => void;
  children: React.ReactNode;
}

const ToolMenu = ({
  name,
  icon: Icon,
  title,
  openMenu,
  onToggle,
  children,
}: ToolMenuProps) => (
  <div className="rte-menu">
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-expanded={openMenu === name}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onToggle(name)}
      className={`rte-btn${openMenu === name ? " is-active" : ""}`}
    >
      <Icon className="rte-btn__icon" />
    </button>

    {openMenu === name ? (
      <div className="rte-menu__panel" onMouseDown={(e) => e.preventDefault()}>
        {children}
      </div>
    ) : null}
  </div>
);

/* ------------------------------------------------------------------ */

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** এডিটরের সর্বনিম্ন উচ্চতা — ভূমিকার বাক্স ছোট, সেকশনেরটা বড় */
  minHeight?: number;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 220,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState(value);
  const [isEmpty, setIsEmpty] = useState(!value);

  /** কোন কমান্ডগুলো এখন চালু — টুলবারের বোতাম জ্বালানোর জন্য */
  const [active, setActive] = useState<Record<string, boolean>>({});

  /** খোলা ড্রপডাউনের নাম — একসাথে একটাই খোলা থাকে */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");

  /* ---------------------------------------------------- শুরুর লেখা */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.innerHTML = value || "";
    setIsEmpty(!editor.textContent?.trim());

    // CSS দিয়ে স্টাইল বসাতে বলি — নাহলে <font> আর <b> ট্যাগ তৈরি হয়,
    // যেগুলোর অর্ধেক সার্ভারের sanitizer চেনে না
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // পুরোনো ব্রাউজারে কমান্ডটা নেই — তখন ডিফল্ট আচরণেই চলুক
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------- বদল জানানো */
  const pushChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsEmpty(!editor.textContent?.trim() && !editor.querySelector("img, hr, table"));
    onChange(editor.innerHTML);
  }, [onChange]);

  /* --------------------------------------------- সিলেকশন মনে রাখা */
  // ড্রপডাউনে ক্লিক করলে এডিটর ফোকাস হারায় আর সিলেকশন মুছে যায়,
  // তাই কমান্ড চালানোর আগে সেটা ফিরিয়ে আনতে হয়।
  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const range = savedRange.current;
    if (!editor) return;

    editor.focus();
    if (!range) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  /* ------------------------------------------- কোন বোতাম জ্বলবে */
  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !editor.contains(document.getSelection()?.anchorNode ?? null)) {
      return;
    }

    const state = (command: string) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    setActive({
      bold: state("bold"),
      italic: state("italic"),
      underline: state("underline"),
      strikeThrough: state("strikeThrough"),
      insertUnorderedList: state("insertUnorderedList"),
      insertOrderedList: state("insertOrderedList"),
      justifyLeft: state("justifyLeft"),
      justifyCenter: state("justifyCenter"),
      justifyRight: state("justifyRight"),
      justifyFull: state("justifyFull"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  }, [refreshActive]);

  /* ---------------------------------------- <font size> সাফ করা */
  /**
   * `execCommand("fontSize")` পুরোনো `<font size="1…7">` বসায়।
   * ৭ নম্বরটা আমরা শুধু চিহ্ন হিসেবে ব্যবহার করি — কমান্ডের পরপরই
   * সেগুলো খুঁজে নিয়ে আসল মাপ বসানো `<span>` এ বদলে দিই।
   */
  const replaceFontTags = useCallback((size: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("font[size]").forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
  }, []);

  /* ------------------------------------------------ কমান্ড চালানো */
  const run = useCallback(
    (command: string, argument?: string) => {
      restoreSelection();
      try {
        document.execCommand(command, false, argument);
      } catch {
        // কোনো কমান্ড এই ব্রাউজারে না থাকলে চুপচাপ ছেড়ে দিই
      }
      rememberSelection();
      pushChange();
      refreshActive();
    },
    [pushChange, refreshActive, rememberSelection, restoreSelection],
  );

  const applyFontSize = useCallback(
    (size: string) => {
      restoreSelection();
      try {
        document.execCommand("fontSize", false, "7");
      } catch {
        // দেখা যাক অন্তত span বসানো যায় কিনা
      }
      replaceFontTags(size);
      rememberSelection();
      pushChange();
    },
    [pushChange, rememberSelection, replaceFontTags, restoreSelection],
  );

  /* ---------------------------------- অনুচ্ছেদের উপরে স্টাইল বসানো */
  /**
   * লাইনের ফাঁক, অক্ষরের ফাঁক আর উপরে-নিচের ফাঁক — এগুলো অক্ষরের নয়,
   * পুরো অনুচ্ছেদের ব্যাপার। তাই সিলেকশন যে যে ব্লক ছুঁয়ে আছে, তাদের
   * প্রত্যেকের উপরে সরাসরি বসানো হয়।
   */
  const applyToBlocks = useCallback(
    (property: string, cssValue: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      restoreSelection();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      let blocks = Array.from(editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
        .filter((el) => range.intersectsNode(el))
        // ভেতরের ব্লক বাদ — বাইরেরটায় বসালেই ভেতরেরটা উত্তরাধিকারে পায়
        .filter((el) => !el.querySelector(BLOCK_SELECTOR));

      // লেখাটা এখনো কোনো ব্লকে মোড়ানো নেই (একদম খালি এডিটরে টাইপ করলে
      // এমন হয়) — তাই আগে একটা <p> বানিয়ে নিই
      if (blocks.length === 0) {
        try {
          document.execCommand("formatBlock", false, "p");
        } catch {
          // না হলে পুরো এডিটরেই বসিয়ে দিই
        }
        blocks = Array.from(
          editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR),
        ).filter((el) => range.intersectsNode(el));
      }

      if (blocks.length === 0) {
        editor.style.setProperty(property, cssValue);
      } else {
        blocks.forEach((el) => {
          if (cssValue === "normal" || cssValue === "") {
            el.style.removeProperty(property);
          } else {
            el.style.setProperty(property, cssValue);
          }
        });
      }

      rememberSelection();
      pushChange();
    },
    [pushChange, rememberSelection, restoreSelection],
  );

  /* --------------------------------------------------------- লিংক */
  const applyLink = useCallback(() => {
    const url = linkUrl.trim();
    if (!url) return;

    // সোজা "example.com" লিখলেও যেন কাজ করে
    const href = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)
      ? url
      : `https://${url}`;

    run("createLink", href);
    setLinkUrl("");
    setOpenMenu(null);
  }, [linkUrl, run]);

  /* ------------------------------------------------ সব সাজ মুছে ফেলা */
  const clearFormatting = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    restoreSelection();
    try {
      document.execCommand("removeFormat");
    } catch {
      // অন্তত ব্লকের স্টাইলগুলো নিচে মুছে যাবে
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      Array.from(editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
        .filter((el) => range.intersectsNode(el))
        .forEach((el) => el.removeAttribute("style"));
    }

    rememberSelection();
    pushChange();
  }, [pushChange, rememberSelection, restoreSelection]);

  /* ------------------------------------------------------- পেস্ট */
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      // insertText বসালে ব্রাউজার নিজেই লাইন ভাঙা সামলায়, আর সাথে
      // বাইরের কোনো স্টাইল আসে না
      document.execCommand("insertText", false, text);
      pushChange();
    },
    [pushChange],
  );

  /* ------------------------------------------------- সোর্স মোড */
  const toggleSource = useCallback(() => {
    if (!sourceMode) {
      setSource(editorRef.current?.innerHTML || "");
      setSourceMode(true);
      return;
    }

    // সোর্স থেকে ফিরছি — টাইপ করা HTML টাই এখন আসল লেখা
    if (editorRef.current) editorRef.current.innerHTML = source;
    setSourceMode(false);
    onChange(source);
    setIsEmpty(!editorRef.current?.textContent?.trim());
  }, [onChange, source, sourceMode]);

  /* ---------------------------------------------------------------- */

  /** ড্রপডাউন খোলা/বন্ধ — খোলার আগে সিলেকশনটা মনে করে রাখা হয় */
  const toggleMenu = useCallback(
    (name: string) => {
      rememberSelection();
      setOpenMenu((current) => (current === name ? null : name));
    },
    [rememberSelection],
  );

  return (
    <div className="rte">
      {/* ============================ TOOLBAR ============================ */}
      <div className="rte-toolbar">
        {/* ---- অক্ষর ---- */}
        <div className="rte-group">
          <ToolButton icon={Bold} title="Bold" isActive={active.bold} onClick={() => run("bold")} />
          <ToolButton
            icon={Italic}
            title="Italic"
            isActive={active.italic}
            onClick={() => run("italic")}
          />
          <ToolButton
            icon={Underline}
            title="Underline"
            isActive={active.underline}
            onClick={() => run("underline")}
          />
          <ToolButton
            icon={Strikethrough}
            title="Strikethrough"
            isActive={active.strikeThrough}
            onClick={() => run("strikeThrough")}
          />
        </div>

        {/* ---- ফন্ট সাইজ ---- */}
        <div className="rte-group">
          <ToolMenu name="size" icon={Type} title="Font size" openMenu={openMenu} onToggle={toggleMenu}>
            <p className="rte-menu__title">Font size</p>
            <div className="rte-menu__grid">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    applyFontSize(size);
                    setOpenMenu(null);
                  }}
                  className="rte-chip"
                >
                  {size.replace("px", "")}
                </button>
              ))}
            </div>
          </ToolMenu>

          {/* ---- লেখার রঙ ---- */}
          <ToolMenu name="color" icon={Palette} title="Text colour" openMenu={openMenu} onToggle={toggleMenu}>
            <p className="rte-menu__title">Text colour</p>
            <div className="rte-menu__swatches">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => {
                    run("foreColor", color.value);
                    setOpenMenu(null);
                  }}
                  className="rte-swatch"
                  style={{ background: color.value }}
                />
              ))}
            </div>
            <label className="rte-menu__custom">
              Custom
              <input
                type="color"
                onChange={(e) => run("foreColor", e.target.value)}
              />
            </label>
          </ToolMenu>

          {/* ---- হাইলাইট ---- */}
          <ToolMenu name="highlight" icon={Highlighter} title="Highlight" openMenu={openMenu} onToggle={toggleMenu}>
            <p className="rte-menu__title">Highlight</p>
            <div className="rte-menu__swatches">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => {
                    run("hiliteColor", color.value);
                    setOpenMenu(null);
                  }}
                  className={`rte-swatch${
                    color.value === "transparent" ? " rte-swatch--none" : ""
                  }`}
                  style={
                    color.value === "transparent"
                      ? undefined
                      : { background: color.value }
                  }
                />
              ))}
            </div>
          </ToolMenu>
        </div>

        {/* ---- শিরোনাম স্তর ---- */}
        <div className="rte-group">
          <ToolButton
            icon={Pilcrow}
            title="Normal text"
            onClick={() => run("formatBlock", "p")}
          />
          <ToolButton
            icon={Heading2}
            title="Sub heading"
            onClick={() => run("formatBlock", "h3")}
          />
          <ToolButton
            icon={Heading3}
            title="Small heading"
            onClick={() => run("formatBlock", "h4")}
          />
        </div>

        {/* ---- তালিকা আর উদ্ধৃতি ---- */}
        <div className="rte-group">
          <ToolButton
            icon={List}
            title="Bullet list"
            isActive={active.insertUnorderedList}
            onClick={() => run("insertUnorderedList")}
          />
          <ToolButton
            icon={ListOrdered}
            title="Numbered list"
            isActive={active.insertOrderedList}
            onClick={() => run("insertOrderedList")}
          />
          <ToolButton
            icon={Quote}
            title="Quote"
            onClick={() => run("formatBlock", "blockquote")}
          />
          <ToolButton
            icon={Minus}
            title="Divider line"
            onClick={() => run("insertHorizontalRule")}
          />
        </div>

        {/* ---- অ্যালাইনমেন্ট ---- */}
        <div className="rte-group">
          <ToolButton
            icon={AlignLeft}
            title="Align left"
            isActive={active.justifyLeft}
            onClick={() => run("justifyLeft")}
          />
          <ToolButton
            icon={AlignCenter}
            title="Align centre"
            isActive={active.justifyCenter}
            onClick={() => run("justifyCenter")}
          />
          <ToolButton
            icon={AlignRight}
            title="Align right"
            isActive={active.justifyRight}
            onClick={() => run("justifyRight")}
          />
          <ToolButton
            icon={AlignJustify}
            title="Justify"
            isActive={active.justifyFull}
            onClick={() => run("justifyFull")}
          />
        </div>

        {/* ---- ফাঁক ---- */}
        <div className="rte-group">
          <ToolMenu name="spacing" icon={Pilcrow} title="Spacing" openMenu={openMenu} onToggle={toggleMenu}>
            <p className="rte-menu__title">Line height</p>
            <div className="rte-menu__grid">
              {LINE_HEIGHTS.map((height) => (
                <button
                  key={height}
                  type="button"
                  onClick={() => applyToBlocks("line-height", height)}
                  className="rte-chip"
                >
                  {height}
                </button>
              ))}
            </div>

            <p className="rte-menu__title">Letter spacing</p>
            <div className="rte-menu__grid">
              {LETTER_SPACINGS.map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  onClick={() => applyToBlocks("letter-spacing", spacing)}
                  className="rte-chip"
                >
                  {spacing === "normal" ? "0" : spacing.replace("em", "")}
                </button>
              ))}
            </div>

            <p className="rte-menu__title">Space above</p>
            <div className="rte-menu__grid">
              {BLOCK_SPACINGS.map((space) => (
                <button
                  key={space}
                  type="button"
                  onClick={() => applyToBlocks("margin-top", space)}
                  className="rte-chip"
                >
                  {space.replace("px", "")}
                </button>
              ))}
            </div>

            <p className="rte-menu__title">Space below</p>
            <div className="rte-menu__grid">
              {BLOCK_SPACINGS.map((space) => (
                <button
                  key={space}
                  type="button"
                  onClick={() => applyToBlocks("margin-bottom", space)}
                  className="rte-chip"
                >
                  {space.replace("px", "")}
                </button>
              ))}
            </div>
          </ToolMenu>
        </div>

        {/* ---- লিংক ---- */}
        <div className="rte-group">
          <ToolMenu name="link" icon={Link2} title="Add link" openMenu={openMenu} onToggle={toggleMenu}>
            <p className="rte-menu__title">Link address</p>
            <div className="rte-menu__row">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
                placeholder="/refund or https://…"
                className="rte-input"
              />
              <button type="button" onClick={applyLink} className="rte-apply">
                Add
              </button>
            </div>
            <p className="rte-menu__hint">
              Select the words first, then paste the address.
            </p>
          </ToolMenu>

          <ToolButton
            icon={Link2Off}
            title="Remove link"
            onClick={() => run("unlink")}
          />
        </div>

        {/* ---- বাকিগুলো ---- */}
        <div className="rte-group rte-group--end">
          <ToolButton icon={Eraser} title="Clear formatting" onClick={clearFormatting} />
          <ToolButton icon={Undo2} title="Undo" onClick={() => run("undo")} />
          <ToolButton icon={Redo2} title="Redo" onClick={() => run("redo")} />
          <ToolButton
            icon={Code2}
            title={sourceMode ? "Back to the editor" : "Edit the HTML"}
            isActive={sourceMode}
            onClick={toggleSource}
          />
        </div>
      </div>

      {/* ============================ EDITOR ============================ */}
      {sourceMode ? (
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          style={{ minHeight }}
          className="rte-source"
        />
      ) : (
        <div className="rte-surface" style={{ minHeight }}>
          {isEmpty ? (
            <span className="rte-placeholder" aria-hidden="true">
              {placeholder}
            </span>
          ) : null}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            spellCheck
            onInput={pushChange}
            onBlur={pushChange}
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onPaste={handlePaste}
            className="rte-editable legal-rich"
          />
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
