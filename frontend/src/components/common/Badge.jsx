/** Small status word. variant: default | success | warning | danger | info. */
export default function Badge({ children, variant = "default" }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
