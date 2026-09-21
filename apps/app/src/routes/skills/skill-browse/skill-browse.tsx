import { RouteFocusModal } from "@/components/modals";
import { useListSkills } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { SquareTwoStack } from "@medusajs/icons";
import { Button, Heading, Input, Text } from "@medusajs/ui";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const PER_PAGE = 12;

const SkillBrowseInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { skills, count, isLoading } = useListSkills(workspaceSlug, {
    source: "template",
    search: search || undefined,
    page,
    perPage: PER_PAGE,
  });
  const totalPage = Math.max(1, Math.ceil(count / PER_PAGE));

  return (
    <>
      <Helmet>
        <title>{t("skills.browse.title")} - Ecbot</title>
      </Helmet>
      <RouteFocusModal.Header />
      <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
        <div className="flex w-full max-w-4xl flex-col gap-y-6 px-6 py-10">
          <div>
            <Heading>{t("skills.browse.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("skills.browse.subtitle")}
            </Text>
          </div>

          <Input
            placeholder={t("skills.browse.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {isLoading ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("skills.list.loading")}
            </Text>
          ) : !skills || skills.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("skills.list.noTemplates")}
            </Text>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col gap-y-3 rounded-lg border bg-ui-bg-field p-4"
                >
                  <div className="flex flex-col gap-y-1">
                    <Text weight="plus">{skill.name}</Text>
                    {skill.description && (
                      <Text size="small" className="text-ui-fg-subtle">
                        {skill.description}
                      </Text>
                    )}
                  </div>
                  <Button
                    size="small"
                    variant="secondary"
                    className="mt-auto w-fit"
                    onClick={() =>
                      navigate(`/${workspaceSlug}/skills/${skill.id}/copy`)
                    }
                  >
                    <SquareTwoStack />
                    {t("actions.copy")}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {count > PER_PAGE && (
            <div className="flex items-center justify-between">
              <Text size="small" className="text-ui-fg-subtle">
                {t("skills.browse.pageInfo", { page, totalPage })}
              </Text>
              <div className="flex gap-x-2">
                <Button
                  size="small"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("actions.previous")}
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={page >= totalPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("actions.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </RouteFocusModal.Body>
    </>
  );
};

export const SkillBrowse = () => {
  return (
    <RouteFocusModal>
      <SkillBrowseInner />
    </RouteFocusModal>
  );
};
