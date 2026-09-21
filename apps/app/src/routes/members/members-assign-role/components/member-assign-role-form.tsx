import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useAssignRoleWorkspaceMember } from "@/hooks/api";
import { useWorkspaceRoles } from "@/hooks/api/workspace-roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Popover } from "@medusajs/ui";
import type { WorkspaceMemberGetResponseDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDebounceValue } from "usehooks-ts";
import zod from "zod";

type MembersAssignRoleFormProps = {
  item: WorkspaceMemberGetResponseDto;
};

const AssignRoleSchema = zod.object({
  role: zod.string().min(1, "Please select a role"),
});

type AssignRoleFormData = zod.infer<typeof AssignRoleSchema>;

export function MembersAssignRoleForm({ item }: MembersAssignRoleFormProps) {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const [search, setSearch] = useState("");
  const [debounceSearch] = useDebounceValue(search, 300);

  const form = useForm<AssignRoleFormData>({
    resolver: zodResolver(AssignRoleSchema),
    defaultValues: {
      role: item.role.id,
    },
  });

  const selectedRole = form.watch("role");

  const { mutateAsync, isPending } = useAssignRoleWorkspaceMember(item.id);
  const { roles, isLoading: isLoadingRoles } = useWorkspaceRoles({
    perPage: 100,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await mutateAsync(data.role);
      handleSuccess();
    } catch (error) {
      // Error handling is typically done by the mutation hook
      console.error("Failed to assign role:", error);
    }
  });

  const filteredRoles =
    roles?.filter((role) =>
      role.name.toLowerCase().includes(debounceSearch.toLowerCase()),
    ) || [];

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="role"
              render={({ field: { onChange } }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("fields.role")}</Form.Label>
                    <Form.Control>
                      <Popover>
                        <Popover.Trigger asChild>
                          <Button
                            className="w-full justify-start"
                            variant="secondary"
                          >
                            {roles?.find((role) => role.id === selectedRole)
                              ?.name || t("members.assignRole.selectRole")}
                          </Button>
                        </Popover.Trigger>
                        <Popover.Content>
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder={t(
                                "members.assignRole.selectRole",
                                "Search for a role...",
                              )}
                              value={search}
                              onValueChange={setSearch}
                              disabled={isLoadingRoles || isPending}
                            />
                            <CommandList className="max-h-48">
                              <CommandGroup>
                                {filteredRoles.length > 0 ? (
                                  filteredRoles.map((role) => (
                                    <CommandItem
                                      key={role.id}
                                      value={role.id}
                                      onSelect={() => {
                                        onChange(role.id);
                                      }}
                                      className={
                                        selectedRole === role.id
                                          ? "bg-ui-bg-component-pressed"
                                          : ""
                                      }
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>{role.name}</span>
                                        {selectedRole === role.id && (
                                          <span className="text-ui-fg-interactive">
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))
                                ) : (
                                  <CommandEmpty>
                                    {isLoadingRoles
                                      ? t("general.loading", "Loading...")
                                      : t(
                                          "members.assignRole.noRoles",
                                          "No roles found",
                                        )}
                                  </CommandEmpty>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </Popover.Content>
                      </Popover>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                );
              }}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button
              size="small"
              type="submit"
              isLoading={isPending}
              disabled={!form.formState.isValid || isPending}
            >
              {t("members.assignRole.assign", "Assign Role")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
}
