export const isRequired = (
  value
) => {
  return (
    String(value ?? "")
      .trim()
      .length > 0
  );
};

export const isEmail = (
  value
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
};