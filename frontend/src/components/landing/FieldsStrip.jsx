import { Bus, Coffee, Factory, HeartPulse, ShoppingBag, Truck, Wrench } from "lucide-react";
import MapleLeaf from "../brand/MapleLeaf";

// The fields our job seekers usually work in.
const FIELDS = [
  { name: "Logistics", icon: Truck },
  { name: "Hospitality", icon: Coffee },
  { name: "Skilled trades", icon: Wrench },
  { name: "Manufacturing", icon: Factory },
  { name: "Transportation", icon: Bus },
  { name: "Health care support", icon: HeartPulse },
  { name: "Retail", icon: ShoppingBag },
];

function FieldList({ hidden = false }) {
  return (
    <ul className="fields-strip-list" aria-hidden={hidden || undefined}>
      {FIELDS.map(({ name, icon: Icon }) => (
        <li className="fields-strip-item" key={name}>
          <span className="fields-strip-icon" aria-hidden="true">
            <Icon size={16} strokeWidth={2.25} />
          </span>
          {name}
        </li>
      ))}
    </ul>
  );
}

/**
 * A slow, endless row of fields under the hero. The list is drawn twice so the
 * loop has no gap; the copy is hidden from screen readers. Hover stops it, and
 * reduced motion shows one still, wrapped list.
 */
export default function FieldsStrip() {
  return (
    <section className="fields-strip" aria-labelledby="fields-strip-title">
      <div className="container fields-strip-inner">
        <h2 className="fields-strip-label" id="fields-strip-title">
          <MapleLeaf className="fields-strip-leaf" />
          Built for people working in
        </h2>
        <div className="fields-strip-viewport">
          <div className="fields-strip-track">
            <FieldList />
            <FieldList hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
