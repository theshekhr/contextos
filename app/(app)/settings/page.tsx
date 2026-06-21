"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const data = await apiGet("/api/settings");
      setHasKey(data.hasKey);
      setMaskedKey(data.maskedKey);
    } catch {
      // leave defaults
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiPost("/api/settings", { apiKey: newKey.trim() });
      setHasKey(data.hasKey);
      setMaskedKey(data.maskedKey);
      setNewKey("");
      setSuccess("API key saved and verified.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove your Gemini API key? AI features will stop working until you add a new one.")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiDelete("/api/settings");
      setHasKey(false);
      setMaskedKey(null);
      setSuccess("API key removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-[15px] font-semibold text-[var(--text)]">Settings</h1>
        <p className="mt-0.5 text-[12px] text-[var(--text3)]">
          Manage your account and AI provider keys
        </p>
      </div>

      <div className="mx-auto max-w-xl px-6 py-6">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--bg4)] text-[13px] font-semibold text-[var(--text)]">
                {(user?.displayName || user?.email || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[14px] font-medium text-[var(--text)]">
                {user?.displayName || "Account"}
              </p>
              <p className="text-[12px] text-[var(--text3)]">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-[14px] font-semibold text-[var(--text)]">Gemini API key</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text2)]">
            ContextOS uses your own Google Gemini API key to extract knowledge from conversations
            and generate context documents. Your key is encrypted before storage and never shared.{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text)] underline"
            >
              Get a free key from Google AI Studio →
            </a>
          </p>

          {loading ? (
            <p className="mt-4 text-[12px] text-[var(--text3)]">Loading...</p>
          ) : (
            <>
              {hasKey && (
                <div className="mt-4 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg3)] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: "var(--green)" }}
                    />
                    <span className="font-mono text-[12px] text-[var(--text2)]">{maskedKey}</span>
                  </div>
                  <button
                    onClick={handleRemove}
                    disabled={saving}
                    className="text-[12px] text-[var(--red)] hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form onSubmit={handleSave} className="mt-4 flex flex-col gap-2.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text3)]">
                  {hasKey ? "Replace key" : "Add your API key"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg3)] px-3 py-2 font-mono text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--border2)]"
                  />
                  <button
                    type="submit"
                    disabled={saving || !newKey.trim()}
                    className="flex-shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-[12px] font-semibold text-[var(--bg)] hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Testing..." : "Save & test"}
                  </button>
                </div>
                {error && <p className="text-[12px] text-[var(--red)]">{error}</p>}
                {success && <p className="text-[12px]" style={{ color: "var(--green)" }}>{success}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}