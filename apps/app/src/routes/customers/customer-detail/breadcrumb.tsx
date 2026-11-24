import { useCustomer } from "@/hooks/api/customers";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useCustomerDisplayName } from "./use-customer-display-name";

export function CustomerDetailBreadcrumb(_props: UIMatch) {
  const { customerId = "" } = useParams<{ customerId: string }>();
  const { customer } = useCustomer(customerId);
  const name = useCustomerDisplayName(customerId);

  return (
    <span>
      {customer ? name : customerId}
      {customer && (
        <Helmet>
          <title>{name} - Ecbot</title>
        </Helmet>
      )}
    </span>
  );
}
