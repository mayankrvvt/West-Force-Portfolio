/**
 * Loose input (route params, form fields, env values, third-party JSON) as text.
 * Strings, numbers, booleans and bigints become their usual text; null,
 * undefined, objects, arrays and functions become "" (never "[object Object]").
 */
export function toText(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return "";
  }
}
