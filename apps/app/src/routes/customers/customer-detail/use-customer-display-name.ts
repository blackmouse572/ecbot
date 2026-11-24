import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useCustomer } from "@/hooks/api/customers";
import { useTranslation } from "react-i18next";

/** The saved name, else the name a channel shows, else "Khách chưa có tên". */
export const useCustomerDisplayName = (customerId: string) => {
  const { t } = useTranslation();
  const { customer } = useCustomer(customerId);
  const { contactPoints } = useContactPointsByCustomer(customerId);

  return (
    customer?.name ||
    contactPoints.find((cp) => cp.displaySenderName)?.displaySenderName ||
    t("customers.detail.unnamed")
  );
};
