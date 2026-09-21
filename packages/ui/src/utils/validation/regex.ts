export const isNumberOnly = (value: string): boolean => {
  return /^\d+$/.test(value);
};

export const isTextOnly = (value: string): boolean => {
  return /^[a-zA-Z]+$/.test(value);
};
