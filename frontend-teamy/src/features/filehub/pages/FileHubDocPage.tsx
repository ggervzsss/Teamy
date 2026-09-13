import { ArrowLeft, Bold, Heading1, Heading2, Italic, LinkIcon, List, ListOrdered, Loader2, Save, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { getFileResource, updateFileResource } from "@/features/filehub/api";
import type { FileResource } from "@/features/filehub/api";
import { useProjectContext } from "@/shared/components/useProjectContext";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";
const toolbarButton = "grid size-9 place-items-center rounded-md border border-white/10 bg-white/5 text-[#c4c7c8] transition-colors hover:bg-white/10 hover:text-white";

type SaveState = "idle" | "saving" | "saved" | "error";

function FileHubDocPage() {
  const { project } = useProjectContext();
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);
  const editorInitializedRef = useRef(false);
  const lastSavedRef = useRef({ title: "", html: "" });
  const hasShownSaveErrorToastRef = useRef(false);
  const currentHtmlRef = useRef("");
  const [file, setFile] = useState<FileResource | null>(null);
  const [title, setTitle] = useState("");
  const [saveRevision, setSaveRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let isMounted = true;
    if (!resourceId) {
      return;
    }
    hasLoadedRef.current = false;
    editorInitializedRef.current = false;
    getFileResource(project.id, resourceId)
      .then((nextFile) => {
        if (isMounted) {
          const loadedHtml = nextFile.content_html || "<p></p>";
          setFile(nextFile);
          setTitle(nextFile.title);
          currentHtmlRef.current = loadedHtml;
          hasLoadedRef.current = true;
          lastSavedRef.current = { title: nextFile.title, html: loadedHtml };
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          const message = caughtError instanceof Error ? caughtError.message : "Could not load this document.";
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [project.id, resourceId]);

  useEffect(() => {
    if (isLoading || !file || !editorRef.current || editorInitializedRef.current) {
      return;
    }
    editorRef.current.innerHTML = currentHtmlRef.current || "<p></p>";
    editorInitializedRef.current = true;
  }, [file, isLoading]);

  useEffect(() => {
    const nextHtml = currentHtmlRef.current;
    if (!hasLoadedRef.current || !resourceId || (lastSavedRef.current.title === title && lastSavedRef.current.html === nextHtml)) {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      updateFileResource(project.id, resourceId, { title, content_html: currentHtmlRef.current })
        .then((updatedFile) => {
          setFile(updatedFile);
          lastSavedRef.current = { title: updatedFile.title, html: currentHtmlRef.current };
          hasShownSaveErrorToastRef.current = false;
          setSaveState("saved");
        })
        .catch(() => {
          setSaveState("error");
          if (!hasShownSaveErrorToastRef.current) {
            toast.error("Could not save the document.");
            hasShownSaveErrorToastRef.current = true;
          }
        });
    }, 700);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [project.id, resourceId, saveRevision, title]);

  function markEditorChanged() {
    currentHtmlRef.current = editorRef.current?.innerHTML || "";
    setSaveState("saving");
    setSaveRevision((currentRevision) => currentRevision + 1);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    markEditorChanged();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pastedHtml = event.clipboardData.getData("text/html");
    if (!pastedHtml) {
      return;
    }
    event.preventDefault();
    document.execCommand("insertHTML", false, pastedHtml);
    markEditorChanged();
  }

  function addLink() {
    const url = window.prompt("Paste a link URL");
    if (url) {
      runCommand("createLink", url);
    }
  }

  if (isLoading) {
    return (
      <div className={`${panelClass} flex items-center gap-3 p-6 text-[#c4c7c8]`}>
        <Loader2 aria-hidden="true" className="animate-spin" size={20} />
        Loading document...
      </div>
    );
  }

  if (error || !file) {
    return <div className="rounded border border-[#ffb4ab]/40 bg-[#ffb4ab]/10 px-4 py-3 text-[#ffb4ab]">{error || "Document not found."}</div>;
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <button
          className={`${labelFont} inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white uppercase hover:bg-white/10`}
          onClick={() => navigate(`/projects/${project.id}/file-hub`)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Resources
        </button>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[clamp(30px,5vw,48px)] leading-tight font-extrabold text-white outline-none"
            maxLength={240}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaveState("saving");
            }}
            value={title}
          />
          <span className={`${labelFont} inline-flex items-center gap-2 text-[#8e9192] uppercase`}>
            {saveState === "saving" ? <Loader2 aria-hidden="true" className="animate-spin" size={14} /> : <Save aria-hidden="true" size={14} />}
            {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save Failed" : "Ready"}
          </span>
        </div>
      </header>

      <div className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-wrap gap-2 border-b border-white/10 bg-black/20 p-3">
          <button className={toolbarButton} onClick={() => runCommand("formatBlock", "h1")} title="Heading 1" type="button">
            <Heading1 aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("formatBlock", "h2")} title="Heading 2" type="button">
            <Heading2 aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("bold")} title="Bold" type="button">
            <Bold aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("italic")} title="Italic" type="button">
            <Italic aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("underline")} title="Underline" type="button">
            <Underline aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("insertUnorderedList")} title="Bullet List" type="button">
            <List aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={() => runCommand("insertOrderedList")} title="Numbered List" type="button">
            <ListOrdered aria-hidden="true" size={18} />
          </button>
          <button className={toolbarButton} onClick={addLink} title="Link" type="button">
            <LinkIcon aria-hidden="true" size={18} />
          </button>
        </div>
        <div
          className="teamy-doc-editor min-h-[60vh] bg-[#f7f7f5] px-6 py-8 text-[#202124] outline-none md:px-12"
          contentEditable
          onInput={markEditorChanged}
          onPaste={handlePaste}
          ref={editorRef}
          suppressContentEditableWarning
        />
      </div>
    </section>
  );
}

export default FileHubDocPage;
