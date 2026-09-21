import { Table } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

type MarketplaceFooterProps = {
  total: number;
  page: number;
  perPage: number;
  totalPage: number;
  onNext: () => void;
  onPrev: () => void;
};

export function MarketplaceFooter({
  total,
  page,
  perPage,
  totalPage,
  onNext,
  onPrev,
}: MarketplaceFooterProps) {
  const { t } = useTranslation();
  if (total === 0) return null;
  return (
    <div className="border-t">
      <Table.Pagination
        count={total}
        pageSize={perPage}
        pageIndex={page - 1}
        pageCount={totalPage}
        canNextPage={page < totalPage}
        canPreviousPage={page > 1}
        nextPage={onNext}
        previousPage={onPrev}
        translations={{
          of: t("general.of"),
          results: t("general.results"),
          pages: t("general.pages"),
          prev: t("general.prev"),
          next: t("general.next"),
        }}
      />
    </div>
  );
}
