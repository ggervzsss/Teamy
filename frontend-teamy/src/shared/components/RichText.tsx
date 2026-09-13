import { List, ListOrdered, Table2 } from "lucide-react";
import type { ClipboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { isRichTextEmpty, sanitizeRichText } from "@/shared/richText";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function plainTextToHtml(text: string) {
  const container = document.createElement("div");
  container.textContent = text;
  return container.innerHTML.replace(/\n/g, "<br>");
}

export function RichTextContent({ className = "", value }: { className?: string; value: string | null | undefined }) {
  if (!value || isRichTextEmpty(value)) {
    return null;
  }

  return <div className={`teamy-rich-text ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}

export function RichTextEditor({
  minHeightClass = "min-h-32",
  onChange,
  placeholder = "Write here...",
  required = false,
  value,
}: {
  minHeightClass?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!editorRef.current || isFocused) {
      return;
    }
    const sanitizedValue = sanitizeRichText(value);
    if (editorRef.current.innerHTML !== sanitizedValue) {
      editorRef.current.innerHTML = sanitizedValue;
    }
  }, [isFocused, value]);

  function emitChange() {
    const nextValue = sanitizeRichText(editorRef.current?.innerHTML || "");
    onChange(isRichTextEmpty(nextValue) ? "" : nextValue);
  }

  function exec(command: string, argument?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    emitChange();
  }

  function insertTable() {
    exec("insertHTML", "<table><tbody><tr><th>Header</th><th>Header</th></tr><tr><td>Value</td><td>Value</td></tr></tbody></table><p><br></p>");
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (!html && !text) {
      return;
    }
    event.preventDefault();
    document.execCommand("insertHTML", false, html ? sanitizeRichText(html) : plainTextToHtml(text));
    emitChange();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#09090b] focus-within:border-white">
      <div className="flex flex-wrap gap-1 border-b border-white/10 bg-white/3 p-2">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          B
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          I
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          U
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => exec("insertUnorderedList")}>
          <List aria-hidden="true" size={14} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered aria-hidden="true" size={14} />
        </ToolbarButton>
        <ToolbarButton label="Insert table" onClick={insertTable}>
          <Table2 aria-hidden="true" size={14} />
        </ToolbarButton>
      </div>
      <div
        aria-label={placeholder}
        aria-required={required}
        className={`teamy-rich-text-editor teamy-rich-text custom-scrollbar ${minHeightClass} max-h-72 overflow-y-auto px-3 py-2 text-white outline-none empty:before:text-[#8e9192] empty:before:content-[attr(data-placeholder)]`}
        contentEditable
        data-placeholder={placeholder}
        onBlur={() => {
          setIsFocused(false);
          emitChange();
        }}
        onFocus={() => setIsFocused(true)}
        onInput={emitChange}
        onPaste={handlePaste}
        ref={editorRef}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}

function ToolbarButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`${labelFont} inline-flex size-8 cursor-pointer items-center justify-center rounded border border-white/10 bg-transparent text-[#c4c7c8] hover:bg-white/10 hover:text-white`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
