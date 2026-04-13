"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import CopyFieldButton from "@/components/ui/copy-field-button";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const inputClasses =
  "w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sa-200/70 outline-none resize-none transition duration-200";

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded transition-colors text-zinc-600 hover:text-zinc-400"
      title="Edit"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}

function SaveCancelButtons({
  onSave,
  onCancel,
  saving,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCancel}
        disabled={saving}
        className="btn-secondary px-3 py-1.5 text-xs"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="btn-primary px-3 py-1.5 text-xs"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-rose-400 text-xs mt-1">{message}</p>;
}

/** Auto-resize a textarea to fit its content. */
function useAutoResize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

/* ------------------------------------------------------------------ */
/*  EditableText                                                       */
/* ------------------------------------------------------------------ */

const SHORT_FIELDS = new Set(["title", "seo_title", "category_hint"]);
const LONG_FIELDS = new Set(["description", "shelf_description"]);

function defaultRows(fieldKey: string): number {
  if (SHORT_FIELDS.has(fieldKey)) return 1;
  if (LONG_FIELDS.has(fieldKey)) return 4;
  return 2;
}

interface EditableTextProps {
  label: string;
  value: string;
  fieldKey: string;
  onSave?: (fieldKey: string, value: unknown) => Promise<void>;
  maxLength?: number;
  disabled?: boolean;
}

export function EditableText({
  label,
  value,
  fieldKey,
  onSave,
  maxLength,
  disabled,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useAutoResize(textareaRef, draft);

  if (!value) return null;

  const charCount = editing ? draft.length : value.length;

  const startEditing = () => {
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(fieldKey, draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-kicker text-zinc-400">{label}</span>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <span className="text-xs text-zinc-500">
                {charCount} chars{maxLength ? ` / ${maxLength}` : ""}
              </span>
              <CopyFieldButton value={value} />
              {onSave && !disabled && <EditButton onClick={startEditing} />}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className={inputClasses}
            rows={defaultRows(fieldKey)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            maxLength={maxLength}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-500">
              {draft.length} chars{maxLength ? ` / ${maxLength}` : ""}
            </span>
            <SaveCancelButtons onSave={save} onCancel={cancel} saving={saving} />
          </div>
          <ErrorMessage message={error} />
        </>
      ) : (
        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EditableList                                                       */
/* ------------------------------------------------------------------ */

interface EditableListProps {
  label: string;
  items: string[];
  fieldKey: string;
  onSave?: (fieldKey: string, value: unknown) => Promise<void>;
  disabled?: boolean;
  renderAsTags?: boolean;
}

export function EditableList({
  label,
  items,
  fieldKey,
  onSave,
  disabled,
  renderAsTags = false,
}: EditableListProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useAutoResize(textareaRef, draft);

  if (!items || items.length === 0) return null;

  const startEditing = () => {
    setDraft(items.join("\n"));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const parseDraft = () =>
    draft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(fieldKey, parseDraft());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const copyValue = renderAsTags
    ? items.join(", ")
    : items.map((b, i) => `${i + 1}. ${b}`).join("\n");

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-kicker text-zinc-400">{label}</span>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <span className="text-xs text-zinc-500">{items.length} items</span>
              <CopyFieldButton value={copyValue} />
              {onSave && !disabled && <EditButton onClick={startEditing} />}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className={inputClasses}
            rows={Math.max(3, items.length)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            placeholder="One item per line"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-500">
              {parseDraft().length} items
            </span>
            <SaveCancelButtons onSave={save} onCancel={cancel} saving={saving} />
          </div>
          <ErrorMessage message={error} />
        </>
      ) : renderAsTags ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-200">
              <span className="text-zinc-500 font-mono text-xs mt-0.5">
                {i + 1}.
              </span>
              <span className="flex-1">
                {bullet}
                <span className="ml-2 text-xs text-zinc-600">
                  {bullet.length} chars
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EditableKeyValue                                                   */
/* ------------------------------------------------------------------ */

interface EditableKeyValueProps {
  label: string;
  data: Record<string, string>;
  fieldKey: string;
  onSave?: (fieldKey: string, value: unknown) => Promise<void>;
  disabled?: boolean;
}

export function EditableKeyValue({
  label,
  data,
  fieldKey,
  onSave,
  disabled,
}: EditableKeyValueProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useAutoResize(textareaRef, draft);

  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  const startEditing = () => {
    setDraft(entries.map(([k, v]) => `${k}: ${v}`).join("\n"));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const parseDraft = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const line of draft.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) {
        // Treat lines without colon as key with empty value
        result[trimmed] = "";
      } else {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        if (key) result[key] = val;
      }
    }
    return result;
  };

  const countPairs = () => Object.keys(parseDraft()).length;

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(fieldKey, parseDraft());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="label-kicker text-zinc-400">{label}</span>
        <div className="flex items-center gap-1">
          {!editing && (
            <>
              <CopyFieldButton
                value={entries.map(([k, v]) => `${k}: ${v}`).join("\n")}
              />
              {onSave && !disabled && <EditButton onClick={startEditing} />}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className={inputClasses}
            rows={Math.max(3, entries.length)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            placeholder="key: value (one pair per line)"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-500">{countPairs()} pairs</span>
            <SaveCancelButtons onSave={save} onCancel={cancel} saving={saving} />
          </div>
          <ErrorMessage message={error} />
        </>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="text-zinc-500 min-w-[120px] shrink-0">{key}</span>
              <span className="text-zinc-200">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
