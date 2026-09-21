import {
  useGetToolkitDetail,
  useMarketplaceCatalog,
  useMarketplaceCategories,
  useStartInstall,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import {
  Badge,
  Button,
  Divider,
  Heading,
  Input,
  Skeleton,
  Text,
  toast,
} from "@medusajs/ui";
import uniqBy from "lodash/uniqBy";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounceCallback } from "usehooks-ts";
import { MarketplaceFooter } from "../../marketplace/components/marketplace-footer";
import {
  ToolkitCard,
  type ToolkitCardData,
} from "../../marketplace/components/toolkit-card";
import { ToolLogo } from "../../components/tool-logo";

const DEFAULT_PER_PAGE = 12;

// ─── Catalog view ────────────────────────────────────────────────────────────

type CatalogViewProps = {
  onSelectToolkit: (slug: string) => void;
  onBack: () => void;
  onCancel: () => void;
};

const CatalogView = ({
  onSelectToolkit,
  onBack,
  onCancel,
}: CatalogViewProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { categories } = useMarketplaceCategories(workspaceSlug);
  const { catalog, total, totalPage, isLoading } = useMarketplaceCatalog(
    workspaceSlug,
    { search, category, page, perPage: DEFAULT_PER_PAGE },
  );

  const toolkits: ToolkitCardData[] = useMemo(
    () => (Array.isArray(catalog) ? (catalog as ToolkitCardData[]) : []),
    [catalog],
  );

  const categoryOptions = useMemo(
    () =>
      uniqBy(
        categories.map((c) => ({ label: c.name, value: c.id })),
        "value",
      ),
    [categories],
  );

  const handleSearchDebounced = useDebounceCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const handleSearch = (value: string) => {
    setInputValue(value);
    handleSearchDebounced(value);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl gap-y-4 overflow-y-auto p-16 mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h2">{t("tools.marketplace.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.browse")}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onBack}
          >
            {t("actions.back")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onCancel}
          >
            {t("actions.cancel")}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          size="small"
          autoComplete="off"
          placeholder={t("tools.marketplace.searchPlaceholder")}
          value={inputValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        {categoryOptions.length > 0 && (
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-1.5 text-sm text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          >
            <option value="">{t("tools.marketplace.categoryAll")}</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {isLoading ? (
        <div className="py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.list.loading")}
          </Text>
        </div>
      ) : toolkits.length === 0 ? (
        <div className="py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.marketplace.noResults")}
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {toolkits.map((toolkit) => (
            <ToolkitCard
              key={toolkit.slug}
              toolkit={toolkit}
              to="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectToolkit(toolkit.slug);
              }}
            />
          ))}
        </div>
      )}
      <MarketplaceFooter
        total={total}
        page={page}
        perPage={DEFAULT_PER_PAGE}
        totalPage={totalPage}
        onNext={() => setPage((p) => p + 1)}
        onPrev={() => setPage((p) => p - 1)}
      />
    </div>
  );
};

// ─── Toolkit detail / confirm view ───────────────────────────────────────────

type ToolkitDetailViewProps = {
  slug: string;
  onBack: () => void;
  onCancel: () => void;
  onInstalled: (toolId?: string) => void;
};

const ToolkitDetailView = ({
  slug,
  onBack,
  onCancel,
  onInstalled,
}: ToolkitDetailViewProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const { startInstall, isPending } = useStartInstall(workspaceSlug);
  const { toolkit, isLoading } = useGetToolkitDetail(workspaceSlug, slug, {
    enabled: !!slug,
  });

  const name = toolkit?.name ?? slug ?? "";
  const description = (toolkit?.meta as A)?.description ?? "";
  const logo = (toolkit?.meta as A)?.logo ?? "";
  const categories = (toolkit?.meta as A)?.categories as
    Array<{ id: string; name: string }> | undefined;

  const handleInstall = async () => {
    try {
      const callbackUrl = `${window.location.origin}/${workspaceSlug}/tools/marketplace/callback`;
      const res = await startInstall({ toolkitSlug: slug, callbackUrl });
      const data = (res?.data as A)?.data as
        | { sessionId?: string; redirectUrl?: string; toolId?: string }
        | undefined;
      const sessionId = data?.sessionId;
      const redirectUrl = data?.redirectUrl;
      const toolId = data?.toolId;

      if (!sessionId) {
        toast.error(t("tools.marketplace.installErrorToast"));
        return;
      }

      if (!redirectUrl) {
        if (!toolId) {
          toast.error(t("tools.marketplace.installErrorToast"));
          return;
        }
        toast.success(t("tools.marketplace.installSuccessToast"));
        onInstalled(toolId);
        return;
      }

      // OAuth redirect — navigate away to provider
      toast.info(t("tools.marketplace.installingToast"));
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error starting install:", error);
      toast.error(t("tools.marketplace.installErrorToast"));
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl gap-y-4 overflow-y-auto p-16 mx-auto">
      <div className="flex items-start gap-x-4">
        <ToolLogo name={name} logo={logo} isLoading={isLoading} size="xlarge" />
        <div className="flex flex-1 flex-col gap-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </>
          ) : (
            <>
              <Heading level="h1">{name}</Heading>
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.map((c) => (
                    <Badge key={c.id} size="2xsmall">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {description && (
        <>
          <Divider />
          <Text size="small" className="text-ui-fg-subtle">
            {description}
          </Text>
        </>
      )}
      <Divider />
      <div className="flex items-center justify-end gap-x-2">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t("actions.back")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleInstall}
          isLoading={isPending}
          disabled={isLoading}
        >
          {t("tools.marketplace.installButton")}
        </Button>
      </div>
    </div>
  );
};

// ─── Public component ─────────────────────────────────────────────────────────

type MarketplaceBrowseStepProps = {
  onBack: () => void;
  onCancel: () => void;
  onInstalled: (toolId?: string) => void;
};

export const MarketplaceBrowseStep = ({
  onBack,
  onCancel,
  onInstalled,
}: MarketplaceBrowseStepProps) => {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  if (selectedSlug) {
    return (
      <ToolkitDetailView
        slug={selectedSlug}
        onBack={() => setSelectedSlug(null)}
        onCancel={onCancel}
        onInstalled={onInstalled}
      />
    );
  }

  return (
    <CatalogView
      onSelectToolkit={setSelectedSlug}
      onBack={onBack}
      onCancel={onCancel}
    />
  );
};
