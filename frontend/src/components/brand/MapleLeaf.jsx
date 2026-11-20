// The 11-point maple leaf from the National Flag of Canada (public domain
// outline, the flag's own construction units). The viewBox fits the leaf
// tightly: 3720 wide by 4030 tall, stem included.
const LEAF_PATH =
  "m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73" +
  "l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38" +
  "l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27" +
  "l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57" +
  "l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79" +
  "l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98" +
  "l45 863z";

/**
 * Decorative maple leaf, filled with currentColor (set it to var(--wf-maple)).
 * Never use it as the logo. Pass outline to also draw a stroke path
 * (pathLength 1) that CSS can animate with stroke-dashoffset.
 */
export default function MapleLeaf({ className = "", outline = false, ...props }) {
  return (
    <svg
      viewBox="-1860 -2000 3720 4030"
      className={`maple-leaf ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path className="maple-leaf-fill" d={LEAF_PATH} fill="currentColor" />
      {outline && (
        <path
          className="maple-leaf-outline"
          d={LEAF_PATH}
          pathLength="1"
          fill="none"
          stroke="currentColor"
        />
      )}
    </svg>
  );
}
