import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Settings, Palette, Brain } from "lucide-react";
import {
  getWorkspaceSettingsSnapshot,
  ProviderConfigUpdateInput,
  updateWorkspaceAppearanceSettings,
  updateAiProviderSettings,
  writeSecretValue,
} from "../../lib/desktop-api";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "appearance" | "ai";

const THEME_MODES = ["light", "dark", "system"] as const;
type ThemeMode = (typeof THEME_MODES)[number];

function applyDesktopTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("appearance");
  const [isSaving, setIsSaving] = useState(false);

  // Appearance settings
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [language, setLanguage] = useState<"en" | "zh">("zh");
  const [autoSave, setAutoSave] = useState(true);
  const [rememberWindowState, setRememberWindowState] = useState(true);

  // AI settings
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [showApiKey, setShowApiKey] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(true);

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const settings = await getWorkspaceSettingsSnapshot();
      const normalizedTheme = (settings.theme as ThemeMode) ?? "system";
      setTheme(normalizedTheme);
      setLanguage((settings.locale as "en" | "zh") || "zh");
      setAutoSave(settings.editor?.autoSave ?? true);
      setRememberWindowState(settings.window?.rememberWindowState ?? true);

      const provider = settings.ai?.defaultProvider || "openai";
      setProvider(provider);
      const config = settings.ai?.providerConfigs?.[provider];
      setBaseUrl(config?.baseUrl || "");
      setModel(config?.model || "gpt-4o");
      setSetAsDefault(true);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      await updateWorkspaceAppearanceSettings({
        locale: language,
        theme,
        autoSave,
        rememberWindowState,
      });
      applyDesktopTheme(theme);
      void i18n.changeLanguage(language);
      onClose();
    } catch (error) {
      console.error("Failed to save appearance settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setIsSaving(true);
    try {
      const payload: ProviderConfigUpdateInput = {
        provider,
        baseUrl,
        model,
        setAsDefault,
      };
      await updateAiProviderSettings(payload);

      if (apiKey.trim()) {
        await writeSecretValue({
          key: `provider.${provider}.api_key`,
          provider,
          value: apiKey.trim(),
        });
      }

      onClose();
    } catch (error) {
      console.error("Failed to save AI settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-pink-500" />
            <h2 className="dialog-title">{t("settingsTitle")}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="dialog-tabs">
          <button
            type="button"
            className={`dialog-tab ${tab === "appearance" ? "dialog-tab--active" : ""}`}
            onClick={() => setTab("appearance")}
          >
            <Palette className="h-4 w-4" />
            {t("settingsTabExperience")}
          </button>
          <button
            type="button"
            className={`dialog-tab ${tab === "ai" ? "dialog-tab--active" : ""}`}
            onClick={() => setTab("ai")}
          >
            <Brain className="h-4 w-4" />
            {t("settingsTabProviders")}
          </button>
        </div>

        {/* Content */}
        <div className="dialog-body">
          {tab === "appearance" ? (
            <div className="space-y-5">
              {/* Theme */}
              <div className="form-field">
                <label className="form-label">{t("themeLabel")}</label>
                <div className="flex gap-2">
                  {THEME_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTheme(mode)}
                      className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                        theme === mode
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {mode === "light" && "☀️"}
                      {mode === "dark" && "🌙"}
                      {mode === "system" && "💻"}
                      <span className="ml-2 text-sm">
                        {mode === "light" && t("themeLight")}
                        {mode === "dark" && t("themeDark")}
                        {mode === "system" && t("themeSystem")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="form-field">
                <label className="form-label">{t("languageLabel")}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "zh")}
                  className="select-input"
                >
                  <option value="zh">{t("languageZh")}</option>
                  <option value="en">{t("languageEn")}</option>
                </select>
              </div>

              {/* Auto Save */}
              <div className="form-field">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300"
                  />
                  <span className="form-label">{t("autoSaveLabel")}</span>
                </label>
              </div>

              <div className="form-field">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberWindowState}
                    onChange={(e) => setRememberWindowState(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300"
                  />
                  <span className="form-label">{t("rememberWindowState")}</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Provider */}
              <div className="form-field">
                <label className="form-label">{t("aiRuntimeProviderLabel")}</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="select-input"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {/* API Key */}
              <div className="form-field">
                <label className="form-label">{t("aiRuntimeApiKeyLabel")}</label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t("aiRuntimeApiKeyPlaceholder")}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="form-field">
                <label className="form-label">{t("baseUrlLabel")}</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              {/* Model */}
              <div className="form-field">
                <label className="form-label">{t("modelLabel")}</label>
                <Input
                  value={model}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value)}
                  placeholder="gpt-4o"
                />
              </div>

              <div className="form-field">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-300"
                  />
                  <span className="form-label">{t("aiRuntimeSetDefaultLabel")}</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            {t("commonCancel")}
          </Button>
          <Button
            onClick={() => void (tab === "appearance" ? handleSaveAppearance() : handleSaveAI())}
            disabled={isSaving}
          >
            {isSaving ? t("commonLoading") : t("editorToolbarSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}
