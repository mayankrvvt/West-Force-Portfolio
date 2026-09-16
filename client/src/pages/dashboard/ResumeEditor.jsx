import {
  ArrowLeft,
  Download,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import {
  saveResume,
} from "../../services/resumeService";


const emptyResume = {
  id: null,

  title:
    "My Professional Resume",

  fileName:
    "WestForce_Resume.pdf",

  atsScore:
    84,

  template:
    "professional",

  content: {
    name: "",
    title: "",
    location: "",
    email: "",
    phone: "",

    summary: "",

    experience: [],

    education: [],

    skills: [],

    projects: [],

    certifications: [],
  },
};


export default function ResumeEditor() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const incomingResume =
    location.state?.resume;


  const [resume, setResume] =
    useState(
      incomingResume ||
      emptyResume
    );

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);


  /* =========================================================
     SAVE
  ========================================================= */

  const handleSave = async () => {
    try {
      setSaving(true);

      await saveResume(
        resume
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     UPDATE CONTENT
  ========================================================= */

  const updateContent = (
    field,
    value
  ) => {
    setResume(
      (current) => ({
        ...current,

        content: {
          ...current.content,

          [field]:
            value,
        },
      })
    );
  };


  /* =========================================================
     UPDATE ARRAY ITEM
  ========================================================= */

  const updateArrayItem = (
    section,
    index,
    value
  ) => {
    setResume(
      (current) => {

        const items =
          [
            ...(current.content[
              section
            ] || []),
          ];

        items[index] =
          value;

        return {
          ...current,

          content: {
            ...current.content,

            [section]:
              items,
          },
        };
      }
    );
  };


  /* =========================================================
     ADD EXPERIENCE
  ========================================================= */

  const addExperience = () => {
    setResume(
      (current) => ({
        ...current,

        content: {
          ...current.content,

          experience: [
            ...(current.content
              .experience || []),

            {
              id:
                `exp-${Date.now()}`,

              company: "",

              position: "",

              location: "",

              startDate: "",

              endDate: "",

              bullets: [
                "",
              ],
            },
          ],
        },
      })
    );
  };


  /* =========================================================
     DELETE EXPERIENCE
  ========================================================= */

  const deleteExperience = (
    index
  ) => {
    setResume(
      (current) => ({
        ...current,

        content: {
          ...current.content,

          experience:
            current.content.experience.filter(
              (_, itemIndex) =>
                itemIndex !==
                index
            ),
        },
      })
    );
  };


  /* =========================================================
     ADD EDUCATION
  ========================================================= */

  const addEducation = () => {
    setResume(
      (current) => ({
        ...current,

        content: {
          ...current.content,

          education: [
            ...(current.content
              .education || []),

            {
              id:
                `edu-${Date.now()}`,

              institution: "",

              degree: "",

              field: "",

              year: "",

              description: "",
            },
          ],
        },
      })
    );
  };


  /* =========================================================
     ADD PROJECT
  ========================================================= */

  const addProject = () => {
    setResume(
      (current) => ({
        ...current,

        content: {
          ...current.content,

          projects: [
            ...(current.content
              .projects || []),

            {
              id:
                `project-${Date.now()}`,

              name: "",

              description: "",

              technologies: "",
            },
          ],
        },
      })
    );
  };


  /* =========================================================
     DOWNLOAD
  ========================================================= */

  const downloadResume = () => {
    window.print();
  };


  return (
    <div className="resume-editor-page">


      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="resume-editor-header">

        <button
          type="button"
          className="resume-editor-back"
          onClick={() =>
            navigate(
              "/dashboard/resume-builder"
            )
          }
        >
          <ArrowLeft size={17} />
          Resume Builder
        </button>


        <div className="resume-editor-title">

          <input
            value={
              resume.title
            }
            onChange={(event) =>
              setResume(
                (current) => ({
                  ...current,

                  title:
                    event.target
                      .value,
                })
              )
            }
          />

          <span>
            Editable Resume
          </span>

        </div>


        <div className="resume-editor-actions">

          {saved && (
            <span className="resume-saved">
              Saved
            </span>
          )}


          <button
            type="button"
            className="product-button"
            onClick={downloadResume}
          >
            <Download size={15} />
            Download PDF
          </button>


          <button
            type="button"
            className="product-button primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={15} />

            {saving
              ? "Saving..."
              : "Save Resume"}
          </button>

        </div>

      </header>


      {/* =====================================================
          EDITOR
      ===================================================== */}

      <main className="resume-editor-layout">


        {/* ===================================================
            LEFT EDITOR
        =================================================== */}

        <section className="resume-editor-controls">

          <EditorSection
            title="Personal Information"
          >

            <Field
              label="Full name"
              value={
                resume.content.name
              }
              onChange={(value) =>
                updateContent(
                  "name",
                  value
                )
              }
            />

            <Field
              label="Professional title"
              value={
                resume.content.title
              }
              onChange={(value) =>
                updateContent(
                  "title",
                  value
                )
              }
            />

            <Field
              label="Location"
              value={
                resume.content.location
              }
              onChange={(value) =>
                updateContent(
                  "location",
                  value
                )
              }
            />

            <Field
              label="Email"
              value={
                resume.content.email
              }
              onChange={(value) =>
                updateContent(
                  "email",
                  value
                )
              }
            />

            <Field
              label="Phone"
              value={
                resume.content.phone
              }
              onChange={(value) =>
                updateContent(
                  "phone",
                  value
                )
              }
            />

          </EditorSection>


          <EditorSection
            title="Professional Summary"
          >

            <textarea
              className="resume-editor-textarea"
              value={
                resume.content.summary
              }
              onChange={(event) =>
                updateContent(
                  "summary",
                  event.target.value
                )
              }
              rows={7}
            />

            <button
              type="button"
              className="resume-ai-button"
            >
              <Sparkles size={14} />
              Improve with AI
            </button>

          </EditorSection>


          <EditorSection
            title="Experience"
          >

            {resume.content.experience.map(
              (item, index) => (
                <ExperienceEditor
                  key={
                    item.id ||
                    index
                  }
                  item={item}
                  index={index}
                  onChange={
                    (value) =>
                      updateArrayItem(
                        "experience",
                        index,
                        value
                      )
                  }
                  onDelete={() =>
                    deleteExperience(
                      index
                    )
                  }
                />
              )
            )}


            <AddButton
              onClick={
                addExperience
              }
            >
              Add Experience
            </AddButton>

          </EditorSection>


          <EditorSection
            title="Education"
          >

            {resume.content.education.map(
              (item, index) => (
                <EducationEditor
                  key={
                    item.id ||
                    index
                  }
                  item={item}
                  onChange={
                    (value) =>
                      updateArrayItem(
                        "education",
                        index,
                        value
                      )
                  }
                />
              )
            )}


            <AddButton
              onClick={
                addEducation
              }
            >
              Add Education
            </AddButton>

          </EditorSection>


          <EditorSection
            title="Skills"
          >

            <textarea
              className="resume-editor-textarea"
              rows={5}
              value={
                resume.content.skills.join(
                  ", "
                )
              }
              onChange={(event) =>
                updateContent(
                  "skills",
                  event.target.value
                    .split(",")
                    .map(
                      (item) =>
                        item.trim()
                    )
                    .filter(Boolean)
                )
              }
              placeholder="React, Node.js, MongoDB, JavaScript..."
            />

          </EditorSection>


          <EditorSection
            title="Projects"
          >

            {resume.content.projects.map(
              (item, index) => (
                <ProjectEditor
                  key={
                    item.id ||
                    index
                  }
                  item={item}
                  onChange={
                    (value) =>
                      updateArrayItem(
                        "projects",
                        index,
                        value
                      )
                  }
                />
              )
            )}


            <AddButton
              onClick={
                addProject
              }
            >
              Add Project
            </AddButton>

          </EditorSection>


          <EditorSection
            title="Certifications"
          >

            {resume.content.certifications.map(
              (item, index) => (
                <div
                  className="resume-editor-item"
                  key={
                    item.id ||
                    index
                  }
                >

                  <Field
                    label="Certificate"
                    value={
                      item.name
                    }
                    onChange={
                      (value) =>
                        updateArrayItem(
                          "certifications",
                          index,
                          {
                            ...item,
                            name:
                              value,
                          }
                        )
                    }
                  />

                  <Field
                    label="Issuer"
                    value={
                      item.issuer
                    }
                    onChange={
                      (value) =>
                        updateArrayItem(
                          "certifications",
                          index,
                          {
                            ...item,
                            issuer:
                              value,
                          }
                        )
                    }
                  />

                </div>
              )
            )}

          </EditorSection>

        </section>


        {/* ===================================================
            LIVE RESUME
        =================================================== */}

        <section className="resume-live-preview-wrapper">

          <div className="resume-live-preview">

            <ResumeDocument
              resume={
                resume
              }
            />

          </div>

        </section>

      </main>

    </div>
  );
}


/* =========================================================
   EDITOR SECTION
========================================================= */

function EditorSection({
  title,
  children,
}) {
  return (
    <section className="resume-editor-section">

      <div className="resume-editor-section-header">

        <h2>
          {title}
        </h2>

      </div>

      <div>
        {children}
      </div>

    </section>
  );
}


/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
}) {
  return (
    <div className="resume-editor-field">

      <label>
        {label}
      </label>

      <input
        className="resume-editor-input"
        value={value || ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

    </div>
  );
}


/* =========================================================
   EXPERIENCE EDITOR
========================================================= */

function ExperienceEditor({
  item,
  index,
  onChange,
  onDelete,
}) {
  const update = (
    field,
    value
  ) => {
    onChange({
      ...item,
      [field]:
        value,
    });
  };


  return (
    <div className="resume-editor-item">

      <div className="resume-editor-item-heading">

        <strong>
          Experience {index + 1}
        </strong>

        <button
          type="button"
          onClick={onDelete}
          title="Delete experience"
        >
          <Trash2 size={15} />
        </button>

      </div>


      <Field
        label="Company"
        value={
          item.company
        }
        onChange={(value) =>
          update(
            "company",
            value
          )
        }
      />

      <Field
        label="Position"
        value={
          item.position
        }
        onChange={(value) =>
          update(
            "position",
            value
          )
        }
      />

      <div className="resume-editor-two-columns">

        <Field
          label="Start"
          value={
            item.startDate
          }
          onChange={(value) =>
            update(
              "startDate",
              value
            )
          }
        />

        <Field
          label="End"
          value={
            item.endDate
          }
          onChange={(value) =>
            update(
              "endDate",
              value
            )
          }
        />

      </div>


      <label className="resume-editor-field">

        <span>
          Achievement bullets
        </span>

        <textarea
          className="resume-editor-textarea"
          rows={5}
          value={(
            item.bullets ||
            []
          ).join("\n")}
          onChange={(event) =>
            update(
              "bullets",
              event.target.value
                .split("\n")
            )
          }
        />

      </label>

    </div>
  );
}


/* =========================================================
   EDUCATION
========================================================= */

function EducationEditor({
  item,
  onChange,
}) {
  const update = (
    field,
    value
  ) => {
    onChange({
      ...item,
      [field]:
        value,
    });
  };


  return (
    <div className="resume-editor-item">

      <Field
        label="Institution"
        value={
          item.institution
        }
        onChange={(value) =>
          update(
            "institution",
            value
          )
        }
      />

      <Field
        label="Degree"
        value={
          item.degree
        }
        onChange={(value) =>
          update(
            "degree",
            value
          )
        }
      />

      <Field
        label="Field of study"
        value={
          item.field
        }
        onChange={(value) =>
          update(
            "field",
            value
          )
        }
      />

      <Field
        label="Year"
        value={
          item.year
        }
        onChange={(value) =>
          update(
            "year",
            value
          )
        }
      />

    </div>
  );
}


/* =========================================================
   PROJECT
========================================================= */

function ProjectEditor({
  item,
  onChange,
}) {
  const update = (
    field,
    value
  ) => {
    onChange({
      ...item,
      [field]:
        value,
    });
  };


  return (
    <div className="resume-editor-item">

      <Field
        label="Project name"
        value={
          item.name
        }
        onChange={(value) =>
          update(
            "name",
            value
          )
        }
      />

      <Field
        label="Technologies"
        value={
          item.technologies
        }
        onChange={(value) =>
          update(
            "technologies",
            value
          )
        }
      />

      <label className="resume-editor-field">

        <span>
          Description
        </span>

        <textarea
          className="resume-editor-textarea"
          rows={5}
          value={
            item.description ||
            ""
          }
          onChange={(event) =>
            update(
              "description",
              event.target.value
            )
          }
        />

      </label>

    </div>
  );
}


/* =========================================================
   ADD BUTTON
========================================================= */

function AddButton({
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      className="resume-add-button"
      onClick={onClick}
    >
      <Plus size={15} />
      {children}
    </button>
  );
}


/* =========================================================
   RESUME DOCUMENT
========================================================= */

function ResumeDocument({
  resume,
}) {
  const content =
    resume.content ||
    emptyResume.content;


  return (
    <article className="resume-document">

      <header className="resume-document-header">

        <h1>
          {content.name ||
            "Your Name"}
        </h1>

        <h2>
          {content.title ||
            "Professional Title"}
        </h2>

        <div className="resume-contact">

          {content.location && (
            <span>
              {content.location}
            </span>
          )}

          {content.email && (
            <span>
              {content.email}
            </span>
          )}

          {content.phone && (
            <span>
              {content.phone}
            </span>
          )}

        </div>

      </header>


      {content.summary && (
        <ResumeDocumentSection
          title="PROFESSIONAL SUMMARY"
        >

          <p>
            {content.summary}
          </p>

        </ResumeDocumentSection>
      )}


      {content.experience?.length >
        0 && (
        <ResumeDocumentSection
          title="EXPERIENCE"
        >

          {content.experience.map(
            (item) => (
              <div
                className="resume-document-entry"
                key={
                  item.id
                }
              >

                <div className="resume-entry-heading">

                  <div>

                    <h3>
                      {item.position}
                    </h3>

                    <strong>
                      {item.company}
                    </strong>

                  </div>

                  <span>
                    {item.startDate}
                    {item.startDate &&
                    item.endDate
                      ? " — "
                      : ""}
                    {item.endDate}
                  </span>

                </div>


                {item.location && (
                  <small>
                    {item.location}
                  </small>
                )}


                <ul>

                  {(item.bullets ||
                    []
                  ).filter(Boolean).map(
                    (
                      bullet,
                      index
                    ) => (
                      <li
                        key={
                          index
                        }
                      >
                        {bullet}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )
          )}

        </ResumeDocumentSection>
      )}


      {content.education?.length >
        0 && (
        <ResumeDocumentSection
          title="EDUCATION"
        >

          {content.education.map(
            (item) => (
              <div
                className="resume-document-entry"
                key={
                  item.id
                }
              >

                <div className="resume-entry-heading">

                  <div>

                    <h3>
                      {item.degree}
                    </h3>

                    <strong>
                      {item.institution}
                    </strong>

                  </div>

                  <span>
                    {item.year}
                  </span>

                </div>

                {item.field && (
                  <p>
                    {item.field}
                  </p>
                )}

              </div>
            )
          )}

        </ResumeDocumentSection>
      )}


      {content.skills?.length >
        0 && (
        <ResumeDocumentSection
          title="TECHNICAL SKILLS"
        >

          <div className="resume-skill-lines">

            <p>
              <strong>
                Skills:
              </strong>{" "}
              {content.skills.join(
                " · "
              )}
            </p>

          </div>

        </ResumeDocumentSection>
      )}


      {content.projects?.length >
        0 && (
        <ResumeDocumentSection
          title="PROJECTS"
        >

          {content.projects.map(
            (item) => (
              <div
                className="resume-document-entry"
                key={
                  item.id
                }
              >

                <h3>
                  {item.name}
                </h3>

                {item.technologies && (
                  <strong>
                    {item.technologies}
                  </strong>
                )}

                <p>
                  {item.description}
                </p>

              </div>
            )
          )}

        </ResumeDocumentSection>
      )}


      {content.certifications?.length >
        0 && (
        <ResumeDocumentSection
          title="CERTIFICATIONS"
        >

          {content.certifications.map(
            (item) => (
              <div
                className="resume-document-entry"
                key={
                  item.id
                }
              >

                <strong>
                  {item.name}
                </strong>

                <span>
                  {" · "}
                  {item.issuer}
                  {item.year
                    ? ` · ${item.year}`
                    : ""}
                </span>

              </div>
            )
          )}

        </ResumeDocumentSection>
      )}

    </article>
  );
}


/* =========================================================
   DOCUMENT SECTION
========================================================= */

function ResumeDocumentSection({
  title,
  children,
}) {
  return (
    <section className="resume-document-section">

      <h2>
        {title}
      </h2>

      {children}

    </section>
  );
}