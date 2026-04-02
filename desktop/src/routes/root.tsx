import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n } from "../i18n";
import { SettingsDialog } from "../components/editor/settings-dialog";
import {
  getBootstrapContext,
  getWorkspaceSettingsSnapshot,
  isBrowserFallbackRuntime,
} from "../lib/desktop-api";

function RoleRoverLogo() {
  return (
    <svg
      className="shell-brand__logo"
      viewBox="0 0 220 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="rover-f"
          x1="2"
          y1="2"
          x2="46"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      <g>
        <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#rover-f)" />

        <g
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M11 12H24" />
          <path d="M22 12V32" />
          <path d="M22 32C22 35.5 20 38 16.5 38C14.5 38 13 37 13 36" />
          <path d="M22 12H30C34.5 12 37 15 37 19C37 23 34.5 26 30 26H22" />
          <path d="M29 26L39 38" />
        </g>

        <circle cx="41" cy="9" r="6" fill="#FCD34D" opacity="0.12" />
        <path
          d="M41 3.5L42.4 8L47 9.5L42.4 11L41 15.5L39.6 11L35 9.5L39.6 8Z"
          fill="#FCD34D"
        />
        <path
          d="M34.5 2L35.1 4L37 4.5L35.1 5L34.5 7L33.9 5L32 4.5L33.9 4Z"
          fill="#FCD34D"
          opacity="0.6"
        />
        <circle cx="45" cy="4" r="1.1" fill="#FCD34D" opacity="0.45" />
      </g>

      <text
        x="54"
        y="33"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="24"
        fontWeight="700"
        fill="#064E3B"
        letterSpacing="-0.5"
      >
        Role<tspan fill="#10B981">Rover</tspan>
      </text>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="shell-settings-link__icon" aria-hidden="true">
      <path
        d="M10.4 2.8h3.2l.6 2.3c.4.1.8.3 1.2.5l2.2-1.1 2.3 2.3-1.1 2.2c.2.4.4.8.5 1.2l2.3.6v3.2l-2.3.6c-.1.4-.3.8-.5 1.2l1.1 2.2-2.3 2.3-2.2-1.1c-.4.2-.8.4-1.2.5l-.6 2.3h-3.2l-.6-2.3c-.4-.1-.8-.3-1.2-.5l-2.2 1.1-2.3-2.3 1.1-2.2c-.2-.4-.4-.8-.5-1.2l-2.3-.6v-3.2l2.3-.6c.1-.4.3-.8.5-1.2L4.5 6.7 6.8 4.4 9 5.5c.4-.2.8-.4 1.2-.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LanguagePicker() {
  const { t } = useTranslation();
  const activeLanguage = i18n.language;

  return (
    <div className="language-picker" aria-label={t("languageLabel")}>
      <button
        type="button"
        className="language-picker__button"
        data-active={activeLanguage === "zh"}
        onClick={() => void i18n.changeLanguage("zh")}
      >
        {t("languageZh")}
      </button>
      <button
        type="button"
        className="language-picker__button"
        data-active={activeLanguage === "en"}
        onClick={() => void i18n.changeLanguage("en")}
      >
        {t("languageEn")}
      </button>
    </div>
  );
}

function RootLayout() {
  const { t } = useTranslation();
  const context = rootRoute.useLoaderData();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isEditorSurface = pathname.startsWith("/editor/");
  const isProductSurface =
    pathname === "/dashboard"
    || pathname === "/templates"
    || isEditorSurface;
  const showShellChrome = !isEditorSurface;
  const isFallback = isBrowserFallbackRuntime(context);
  const commandsLabel = context.supportsNativeCommands
    ? t("runtimeNativeCommandsReady")
    : t("runtimeNativeCommandsUnavailable");
  const runtimeSummary = isFallback
    ? t("runtimeFallbackSummary")
    : t("runtimeNativeSummary");
  const navItems = isProductSurface
    ? ([{ to: "/templates", label: t("templatesTitle"), exact: true }] as const)
    : ([
        { to: "/dashboard", label: t("libraryLabel"), exact: true },
        { to: "/templates", label: t("templatesTitle"), exact: true },
      ] as const);

  useEffect(() => {
    const applyWorkspaceSettings = async () => {
      try {
        const settings = await getWorkspaceSettingsSnapshot();
        const theme = settings.theme;
        const resolvedTheme =
          theme === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : theme;
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
        document.documentElement.lang = settings.locale;
        if (i18n.language !== settings.locale) {
          await i18n.changeLanguage(settings.locale);
        }
      } catch (error) {
        console.error("Failed to apply workspace settings:", error);
      }
    };

    void applyWorkspaceSettings();
  }, []);

  return (
    <div
      className={
        isEditorSurface
          ? "h-screen overflow-hidden bg-zinc-50 dark:bg-background"
          : isProductSurface
            ? "min-h-screen bg-zinc-50 dark:bg-background"
            : "app-shell"
      }
    >
      {showShellChrome ? (
        <header
          className={
            isProductSurface
              ? "sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/60"
              : "shell-header"
          }
        >
          <div
            className={
              isProductSurface
                ? "mx-auto flex h-14 max-w-7xl items-center justify-between px-4"
                : "shell-header__inner"
            }
          >
            <div className="shell-header__left">
              <Link className="shell-brand" to="/dashboard" aria-label="RoleRover">
                <RoleRoverLogo />
              </Link>

              <nav className="shell-nav" aria-label={t("shellNavigationLabel")}>
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="shell-nav__link"
                    activeProps={{ className: "shell-nav__link shell-nav__link--active" }}
                    activeOptions={{ exact: item.exact }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="shell-header__actions">
              <LanguagePicker />
              <button
                type="button"
                className="shell-settings-link cursor-pointer"
                onClick={() => setSettingsDialogOpen(true)}
                aria-label={t("navSettings")}
                title={t("navSettings")}
              >
                <SettingsIcon />
              </button>
            </div>
          </div>
        </header>
      ) : null}

      {!isProductSurface ? (
        <section className="shell-status">
          <div className="shell-status__inner">
            <div className="shell-status__copy">
              <p className="shell-status__eyebrow">{t("runtimeBoundaryLabel")}</p>
              <p className="shell-status__text">{runtimeSummary}</p>
            </div>
            <div className="shell-status__facts">
              <span className={`status-badge status-badge--${isFallback ? "warn" : "success"}`}>
                {t(isFallback ? "runtimeFallbackBadge" : "runtimeNativeBadge")}
              </span>
              <span
                className={`status-badge status-badge--${context.supportsNativeCommands ? "success" : "warn"}`}
              >
                {commandsLabel}
              </span>
              <span className="status-badge status-badge--muted">{context.buildChannel}</span>
            </div>
          </div>
          {context.limitations.length > 0 ? (
            <p className="shell-status__note">{context.limitations[0]}</p>
          ) : null}
        </section>
      ) : null}

      <main
        className={
          isEditorSurface
            ? "h-screen overflow-hidden"
            : isProductSurface
              ? "mx-auto max-w-7xl px-4 py-8"
              : "shell-main"
        }
      >
        <Outlet />
      </main>
      {showShellChrome ? (
        <SettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}

export const rootRoute = createRootRoute({
  loader: async () => getBootstrapContext(),
  component: RootLayout,
});
