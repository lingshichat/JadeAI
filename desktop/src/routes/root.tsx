import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { i18n } from "../i18n";

function LanguagePicker() {
  const { t } = useTranslation();
  const activeLanguage = i18n.language;

  return (
    <div className="language-picker" aria-label={t("languageLabel")}>
      <button
        type="button"
        data-active={activeLanguage === "zh"}
        onClick={() => void i18n.changeLanguage("zh")}
      >
        {t("languageZh")}
      </button>
      <button
        type="button"
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
  const navItems = [
    { to: "/", label: t("navOverview") },
    { to: "/library", label: t("navLibrary") },
    { to: "/imports", label: t("navImports") },
    { to: "/settings", label: t("navSettings") },
  ] as const;

  return (
    <div className="app-frame">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("subtitle")}</h1>
        </div>
        <div className="hero__actions">
          <LanguagePicker />
          <Link className="hero__link" to="/library">
            {t("navLibrary")}
          </Link>
        </div>
      </header>
      <nav className="shell-nav" aria-label={t("shellNavigationLabel")}>
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="shell-nav__link"
            activeProps={{ className: "shell-nav__link shell-nav__link--active" }}
            activeOptions={{ exact: item.to === "/" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="content-grid">
        <Outlet />
      </main>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
