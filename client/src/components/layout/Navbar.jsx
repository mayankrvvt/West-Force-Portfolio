import { Link } from "react-router-dom";
import Button from "../common/Button";
import { publicNavigation } from "../../constants/navigation";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">

        <Link to="/" className="brand">
          <img
            src="/favicon.png"
            alt="WestForce"
          />

          <span>WestForce Portfolio</span>
        </Link>

        <nav className="nav-links">
          {publicNavigation.map((item) => (
            <Link
              key={item.label}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/auth/sign-in">
            <Button variant="secondary">
              Sign in
            </Button>
          </Link>

          <Link to="/auth/sign-up">
            <Button>
              Get started
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}