import { useAccount } from "@/hooks/api";
import type { AccountGetDetailResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";

type ProductDetailBreadcrumbProps = UIMatch<AccountGetDetailResponseDto>;

export const ProductDetailBreadcrumb = (
  props: ProductDetailBreadcrumbProps,
) => {
  const { id } = props.params || {};

  const { account } = useAccount(id!, {
    initialData: props.data,
    enabled: Boolean(id),
  });

  if (!account) {
    return null;
  }

  return (
    <span>
      {account.name}
      <Helmet>
        <title>{account.name} - Ecbot</title>
      </Helmet>
    </span>
  );
};
