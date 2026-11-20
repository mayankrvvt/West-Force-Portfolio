import { services } from "../../constants/servicesData";

export default function Services() {
  return (
    <section
      id="services"
      className="home-section"
      aria-labelledby="services-title"
    >
      <div className="container">
        <div className="home-section-head">
          <h2 id="services-title">
            Support for every step of your job search
          </h2>

          <p>
            From employer matching to credential guidance,
            WestForce brings your professional journey
            together in one place.
          </p>
        </div>

        <ul className="service-list">
          {services.map((service) => (
            <li key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
