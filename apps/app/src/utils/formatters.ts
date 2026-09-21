export const formatCurrency = (
  amount: number | undefined,
  currency: string | undefined,
) => {
  if (!amount || !currency) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};
