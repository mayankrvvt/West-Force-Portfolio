const icons = {
  certificate: (
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 13v8l3-2 3 2v-8" />
    </>
  ),

  briefcase: (
    <>
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
      />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 11h18" />
      <path d="M10 11v2h4v-2" />
    </>
  ),

  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle
        cx="9"
        cy="7"
        r="4"
      />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),

  video: (
    <>
      <rect
        x="3"
        y="6"
        width="13"
        height="12"
        rx="2"
      />
      <path d="m16 10 5-3v10l-5-3z" />
    </>
  ),

  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="m8 15 3-4 3 2 5-7" />
    </>
  ),

  graduation: (
    <>
      <path d="m2 10 10-5 10 5-10 5z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
      <path d="M22 10v6" />
    </>
  ),

  plane: (
    <>
      <path d="M2 16l20-7-20-7 5 7z" />
      <path d="M7 9 4 21l5-5" />
    </>
  ),

  shield: (
    <>
      <path d="M12 3 20 6v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  handshake: (
    <>
      <path d="m4 11 4-4 4 2 4-2 4 4-4 4-4-2-4 2z" />
      <path d="m8 7-2-2" />
      <path d="m16 7 2-2" />
    </>
  ),

  lock: (
    <>
      <rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),

  document: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),

  user: (
    <>
      <circle
        cx="12"
        cy="7"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),

  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),

  search: (
    <>
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-4-4" />
    </>
  ),

  settings: (
    <>
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.6V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),
};

export default function Icon({
  name,
  size = 24,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.document}
    </svg>
  );
}