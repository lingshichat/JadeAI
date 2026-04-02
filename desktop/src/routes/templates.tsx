import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { rootRoute } from "./root";
import { TEMPLATES, type Template } from "@/lib/constants";
import {
  buildTemplateValidationDocumentHtml,
} from "../lib/template-validation";
import { createDocument, type TemplateValidationDocument } from "../lib/desktop-api";

// Template label i18n keys map (matching web template-labels.ts)
const templateLabelKeys: Record<Template, string> = {
  classic: "templateClassic",
  modern: "templateModern",
  minimal: "templateMinimal",
  professional: "templateProfessional",
  "two-column": "templateTwoColumn",
  creative: "templateCreative",
  ats: "templateAts",
  academic: "templateAcademic",
  elegant: "templateElegant",
  executive: "templateExecutive",
  developer: "templateDeveloper",
  designer: "templateDesigner",
  startup: "templateStartup",
  formal: "templateFormal",
  infographic: "templateInfographic",
  compact: "templateCompact",
  euro: "templateEuro",
  clean: "templateClean",
  bold: "templateBold",
  timeline: "templateTimeline",
  nordic: "templateNordic",
  corporate: "templateCorporate",
  consultant: "templateConsultant",
  finance: "templateFinance",
  medical: "templateMedical",
  gradient: "templateGradient",
  metro: "templateMetro",
  material: "templateMaterial",
  coder: "templateCoder",
  blocks: "templateBlocks",
  magazine: "templateMagazine",
  artistic: "templateArtistic",
  retro: "templateRetro",
  neon: "templateNeon",
  watercolor: "templateWatercolor",
  swiss: "templateSwiss",
  japanese: "templateJapanese",
  berlin: "templateBerlin",
  luxe: "templateLuxe",
  rose: "templateRose",
  architect: "templateArchitect",
  legal: "templateLegal",
  teacher: "templateTeacher",
  scientist: "templateScientist",
  engineer: "templateEngineer",
  sidebar: "templateSidebar",
  card: "templateCard",
  zigzag: "templateZigzag",
  ribbon: "templateRibbon",
  mosaic: "templateMosaic",
};

// Mock date for stable rendering
const MOCK_DATE = new Date("2025-01-01T00:00:00Z");

// Build a mock template validation document for preview
function buildMockTemplateDocument(template: string): TemplateValidationDocument {
  return {
    metadata: {
      id: `mock-${template}`,
      title: "Sample Resume",
      template,
      language: "en",
      targetJobTitle: "Senior Software Engineer",
      targetCompany: "TechCorp",
      isDefault: false,
      isSample: true,
      createdAtEpochMs: MOCK_DATE.getTime(),
      updatedAtEpochMs: MOCK_DATE.getTime(),
    },
    theme: {
      primaryColor: "#1a1a1a",
      accentColor: "#3b82f6",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 16,
      avatarStyle: "circle",
    },
    sections: [
      {
        id: "s1",
        documentId: `mock-${template}`,
        sectionType: "personal_info",
        title: "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: "Alex Chen",
          jobTitle: "Senior Software Engineer",
          email: "alex@example.com",
          phone: "+1 (555) 123-4567",
          location: "San Francisco, CA",
          website: "https://alexchen.dev",
          linkedin: "linkedin.com/in/alexchen",
          github: "github.com/alexchen",
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s2",
        documentId: `mock-${template}`,
        sectionType: "summary",
        title: "Summary",
        sortOrder: 1,
        visible: true,
        content: {
          text: "Full-stack engineer with 8+ years of experience building scalable web applications. Passionate about clean architecture, developer experience, and mentoring teams.",
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s3",
        documentId: `mock-${template}`,
        sectionType: "work_experience",
        title: "Work Experience",
        sortOrder: 2,
        visible: true,
        content: {
          items: [
            {
              id: "w1",
              company: "TechCorp Inc.",
              position: "Senior Software Engineer",
              location: "San Francisco, CA",
              startDate: "2021-03",
              endDate: null,
              current: true,
              description: "Led a team of 6 engineers building the next-gen analytics platform.",
              highlights: [
                "Reduced page load time by 40% through code splitting and lazy loading",
                "Designed microservices architecture serving 2M+ daily active users",
              ],
            },
            {
              id: "w2",
              company: "StartupXYZ",
              position: "Software Engineer",
              location: "Remote",
              startDate: "2018-06",
              endDate: "2021-02",
              current: false,
              description: "Built core product features from 0 to 1.",
              highlights: [
                "Implemented real-time collaboration features using WebSockets",
                "Improved CI/CD pipeline reducing deployment time by 60%",
              ],
            },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s4",
        documentId: `mock-${template}`,
        sectionType: "education",
        title: "Education",
        sortOrder: 3,
        visible: true,
        content: {
          items: [
            {
              id: "e1",
              institution: "University of California, Berkeley",
              degree: "Bachelor of Science",
              field: "Computer Science",
              location: "Berkeley, CA",
              startDate: "2014-09",
              endDate: "2018-05",
              gpa: "3.8",
              highlights: ["Dean's List", "ACM Programming Contest Finalist"],
            },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s5",
        documentId: `mock-${template}`,
        sectionType: "skills",
        title: "Skills",
        sortOrder: 4,
        visible: true,
        content: {
          categories: [
            { id: "sk1", name: "Frontend", skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"] },
            { id: "sk2", name: "Backend", skills: ["Node.js", "Python", "PostgreSQL", "Redis"] },
            { id: "sk3", name: "DevOps", skills: ["Docker", "AWS", "CI/CD", "Kubernetes"] },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s6",
        documentId: `mock-${template}`,
        sectionType: "projects",
        title: "Projects",
        sortOrder: 5,
        visible: true,
        content: {
          items: [
            {
              id: "p1",
              name: "OpenSource CMS",
              url: "https://github.com/alexchen/cms",
              description: "A headless CMS built with Next.js and GraphQL.",
              technologies: ["Next.js", "GraphQL", "PostgreSQL"],
              highlights: ["1.2k+ GitHub stars", "Used by 50+ companies"],
            },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s7",
        documentId: `mock-${template}`,
        sectionType: "certifications",
        title: "Certifications",
        sortOrder: 6,
        visible: true,
        content: {
          items: [
            { id: "c1", name: "AWS Solutions Architect", issuer: "Amazon Web Services", date: "2023-05" },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
      {
        id: "s8",
        documentId: `mock-${template}`,
        sectionType: "languages",
        title: "Languages",
        sortOrder: 7,
        visible: true,
        content: {
          items: [
            { id: "l1", language: "English", proficiency: "Native" },
            { id: "l2", language: "Mandarin", proficiency: "Native" },
          ],
        },
        createdAtEpochMs: MOCK_DATE.getTime(),
        updatedAtEpochMs: MOCK_DATE.getTime(),
      },
    ],
  };
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="template-icon" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10H5m0 0l4 4m-4-4l4-4"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="template-icon" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 10c1.5-3 5-6 7.5-6s6 3 7.5 6c-1.5 3-5 6-7.5 6s-6-3-7.5-6z"
      />
      <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="template-icon template-icon--spin" aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="32"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="template-icon" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5l10 10M15 5L5 15"
      />
    </svg>
  );
}

function TemplatesRoute() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<Template | null>(null);

  // Build preview HTML for the selected template
  const previewHtml = useMemo(() => {
    if (!previewTemplate) return "";
    const document = buildMockTemplateDocument(previewTemplate);
    return buildTemplateValidationDocumentHtml(document);
  }, [previewTemplate]);

  // Handle using a template to create a new resume
  const handleUseTemplate = async (template: Template) => {
    setCreatingTemplate(template);
    try {
      const document = await createDocument({
        template,
        language: i18n.language.toLowerCase().startsWith("zh") ? "zh" : "en",
      });
      navigate({ to: "/editor/$id", params: { id: document.id } });
    } catch (error) {
      console.error("[templates] Failed to create document from template:", error);
    } finally {
      setCreatingTemplate(null);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__copy">
          <Link to="/dashboard" className="template-back-link">
            <ArrowLeftIcon />
            {t("templatesBack")}
          </Link>
          <h1 className="page-header__title">{t("templatesTitle")}</h1>
          <p className="page-header__body">{t("templatesSubtitle")}</p>
        </div>
      </header>

      {/* Template Grid */}
      <section className="surface">
        <div className="templates-grid">
          {TEMPLATES.map((template: Template, idx: number) => {
            const labelKey = templateLabelKeys[template] ?? "templateClassic";
            const label = t(labelKey);
            const isCreating = creatingTemplate === template;
            const isFirst = idx === 0;

            return (
              <article key={template} className="template-card">
                {/* Template name */}
                <div className="template-card__header">
                  <h3 className="template-card__name">{label}</h3>
                </div>

                {/* Scaled preview */}
                <div className="template-card__preview">
                  <div className="template-card__scale">
                    <iframe
                      title={label}
                      className="template-card__iframe"
                      srcDoc={buildTemplateValidationDocumentHtml(
                        buildMockTemplateDocument(template),
                      )}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="template-card__actions">
                  <button
                    type="button"
                    {...(isFirst ? { "data-tour": "tpl-preview" } : {})}
                    className="button button--secondary template-card__button"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <EyeIcon />
                    {t("templatesPreview")}
                  </button>
                  <button
                    type="button"
                    {...(isFirst ? { "data-tour": "tpl-use" } : {})}
                    className="button button--primary template-card__button"
                    onClick={() => void handleUseTemplate(template)}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <LoaderIcon />
                        {t("templatesCreating")}
                      </>
                    ) : (
                      t("templatesUseTemplate")
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Full-size preview dialog */}
      {previewTemplate && (
        <div
          className="template-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t(templateLabelKeys[previewTemplate] ?? "templateClassic")}
          tabIndex={-1}
          onClick={() => setPreviewTemplate(null)}
          onKeyDown={(e) => e.key === "Escape" && setPreviewTemplate(null)}
        >
          <div className="template-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="template-dialog__header">
              <h2 className="template-dialog__title">
                {t(templateLabelKeys[previewTemplate] ?? "templateClassic")}
              </h2>
              <button
                type="button"
                className="template-dialog__close"
                onClick={() => setPreviewTemplate(null)}
                aria-label={t("close")}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="template-dialog__body">
              <iframe
                title={t(templateLabelKeys[previewTemplate] ?? "templateClassic")}
                className="template-dialog__iframe"
                srcDoc={previewHtml}
              />
            </div>
            <div className="template-dialog__footer">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setPreviewTemplate(null)}
              >
                {t("close")}
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  const template = previewTemplate;
                  setPreviewTemplate(null);
                  void handleUseTemplate(template);
                }}
              >
                {t("templatesUseTemplate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesRoute,
});
