import {
  useUpdateCustomer,
  type CustomerGetResponseDto,
  type CustomerUpdateRequestDto,
} from "@/hooks/api/customers";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Drawer, Input, Textarea, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useEffect, type FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import zod from "zod";

const CustomerFormSchema = zod.object({
  name: zod.string().max(255).optional().nullable(),
  phone: zod.string().max(50).optional().nullable(),
  email: zod
    .string()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "invalid email"),
  language: zod.string().max(10).optional().nullable(),
  notes: zod.string().max(5000).optional().nullable(),
});

type CustomerFormData = zod.infer<typeof CustomerFormSchema>;

type Props = {
  customerId: string;
  customer: CustomerGetResponseDto | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KEY = "conversations.customer.panel";

const toFormValues = (
  customer: CustomerGetResponseDto | undefined,
): CustomerFormData => ({
  name: customer?.name ?? "",
  phone: customer?.phone ?? "",
  email: customer?.email ?? "",
  language: customer?.language ?? "",
  notes: customer?.notes ?? "",
});

/** The customer's own details, edited beside the open conversation. */
export const CustomerEditDrawer: FC<Props> = ({
  customerId,
  customer,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useUpdateCustomer(customerId);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerFormSchema),
    defaultValues: toFormValues(customer),
  });

  // Start from the saved details each time the drawer opens. Skip while the
  // user is mid-edit so a background refetch doesn't clobber their changes.
  useEffect(() => {
    if (open && !form.formState.isDirty) form.reset(toFormValues(customer));
  }, [open, customer, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const patch: CustomerUpdateRequestDto = {
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      language: data.language?.trim() || null,
      notes: data.notes?.trim() || null,
    };

    try {
      await mutateAsync(patch);
      toast.success(t(`${KEY}.toast.updated`));
      onOpenChange(false);
    } catch {
      toast.error(t(`${KEY}.toast.updateFailed`));
    }
  });

  const textField = (
    name: Exclude<keyof CustomerFormData, "notes">,
    placeholder?: string,
  ) => (
    <Form.Field
      control={form.control}
      name={name}
      render={({ field }) => (
        <Form.Item>
          <Form.Label>{t(`${KEY}.fields.${name}`)}</Form.Label>
          <Form.Control>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder={placeholder}
            />
          </Form.Control>
          <Form.ErrorMessage />
        </Form.Item>
      )}
    />
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <Drawer.Header>
              <Drawer.Title>{t(`${KEY}.edit.title`)}</Drawer.Title>
              <Drawer.Description className="sr-only">
                {t(`${KEY}.edit.description`)}
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
              {textField("name")}
              {textField("phone")}
              {textField("email")}
              {textField("language", t(`${KEY}.fields.languagePlaceholder`))}
              <Form.Field
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t(`${KEY}.fields.notes`)}</Form.Label>
                    <Form.Control>
                      <Textarea {...field} value={field.value ?? ""} rows={5} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button type="button" variant="secondary" size="small">
                  {t("actions.cancel")}
                </Button>
              </Drawer.Close>
              <Button
                type="submit"
                variant="primary"
                size="small"
                isLoading={isPending}
                disabled={isPending || !form.formState.isDirty}
              >
                {t("actions.save")}
              </Button>
            </Drawer.Footer>
          </form>
        </Form>
      </Drawer.Content>
    </Drawer>
  );
};
