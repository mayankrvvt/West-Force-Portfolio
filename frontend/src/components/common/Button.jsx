/**
 * Shared button. variant: primary | secondary | ghost | danger (hero and
 * hero-outline still work for old pages). size: sm | md | lg.
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) {
  const sizeClass = size === "md" ? "" : `btn-${size}`;

  return (
    <button
      type={type}
      className={["btn", `btn-${variant}`, sizeClass, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
