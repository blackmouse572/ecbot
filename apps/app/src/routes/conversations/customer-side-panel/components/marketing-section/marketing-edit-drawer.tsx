import {
  CUSTOMER_PERMISSIONS,
  CUSTOMER_STAGES,
  MarketingStageBadge,
} from "@/components/customer-marketing";
import {
  useUpdateCustomerMarketing,
  type CustomerMarketingStateGetResponseDto,
  type CustomerMarketingStateUpdateRequestDto,
} from "@/hooks/api/customer-marketing";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  DatePicker,
  Drawer,
  RadioGroup,
  Select,
  Switch,
  Textarea,
  toast,
} from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useEffect, type FC } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { marketingEditSchema, type MarketingEditFormData } from "./schemas";

type Props = {
  customerId: string;
  customerName?: string | null;
  marketing: CustomerMarketingStateGetResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KEY = "conversations.customer.panel.marketing.edit";

const toFormValues = (
  marketing: CustomerMarketingStateGetResponseDto,
): MarketingEditFormData => ({
  stage: marketing.stage,
  permission: marketing.permission,
  permissionUntil: marketing.permissionUntil
    ? new Date(marketing.permissionUntil)
    : null,
  hostile: marketing.hostile,
  reason: "",
});

// A pause covers the whole picked day.
const endOfDay = (date: Date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end.toISOString();
};

/** Only what the operator changed, so untouched layers write no event. */
const toChange = (
  data: MarketingEditFormData,
  initial: MarketingEditFormData,
): CustomerMarketingStateUpdateRequestDto => {
  const change: CustomerMarketingStateUpdateRequestDto = {
    reason: data.reason,
  };

  if (data.stage !== initial.stage) change.stage = data.stage;

  if (data.hostile !== initial.hostile) change.hostile = data.hostile;

  const untilChanged =
    data.permission === "PAUSED" &&
    data.permissionUntil?.getTime() !== initial.permissionUntil?.getTime();

  if (data.permission !== initial.permission || untilChanged) {
    change.permission = data.permission;

    if (data.permission === "PAUSED" && data.permissionUntil) {
      change.permissionUntil = endOfDay(data.permissionUntil);
    }
  }

  return change;
};

/** "Sửa nhãn": set any layer by hand, with a reason the timeline keeps. */
export const MarketingEditDrawer: FC<Props> = ({
  customerId,
  customerName,
  marketing,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const update = useUpdateCustomerMarketing(customerId);
  const initial = toFormValues(marketing);

  const form = useForm<MarketingEditFormData>({
    resolver: zodResolver(marketingEditSchema),
    defaultValues: initial,
  });

  // Start from the current labels each time the drawer opens.
  useEffect(() => {
    if (open) form.reset(toFormValues(marketing));
  }, [open, marketing, form]);

  const [stage, permission, permissionUntil, hostile] = useWatch({
    control: form.control,
    name: ["stage", "permission", "permissionUntil", "hostile"],
  });

  const changed =
    Object.keys(
      toChange(
        { stage, permission, permissionUntil, hostile, reason: "" },
        initial,
      ),
    ).length > 1;

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await update.mutateAsync(toChange(data, initial));
      toast.success(t(`${KEY}.saved`));
      onOpenChange(false);
    } catch {
      toast.error(t(`${KEY}.saveFailed`));
    }
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <Drawer.Header>
              <Drawer.Title>{t(`${KEY}.title`)}</Drawer.Title>
              <Drawer.Description>
                {customerName
                  ? t(`${KEY}.descriptionNamed`, { name: customerName })
                  : t(`${KEY}.description`)}
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
              <Form.Field
                control={form.control}
                name="stage"
                render={({ field: { onChange, ref, ...field } }) => (
                  <Form.Item>
                    <Form.Label>{t(`${KEY}.stage`)}</Form.Label>
                    <Form.Control>
                      <Select {...field} onValueChange={onChange}>
                        <Select.Trigger ref={ref}>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          {CUSTOMER_STAGES.map((value) => (
                            <Select.Item key={value} value={value}>
                              <MarketingStageBadge stage={value} />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.Hint>{t(`${KEY}.stageHint`)}</Form.Hint>
                  </Form.Item>
                )}
              />

              <Form.Field
                control={form.control}
                name="permission"
                render={({ field: { onChange, ...field } }) => (
                  <Form.Item>
                    <Form.Label>{t(`${KEY}.permission`)}</Form.Label>
                    <Form.Control>
                      <RadioGroup
                        {...field}
                        onValueChange={onChange}
                        className="flex flex-col gap-y-2"
                      >
                        {CUSTOMER_PERMISSIONS.map((value) => (
                          <RadioGroup.ChoiceBox
                            key={value}
                            value={value}
                            label={t(`${KEY}.permissionOption.${value}`)}
                            description={t(`${KEY}.permissionHint.${value}`)}
                          />
                        ))}
                      </RadioGroup>
                    </Form.Control>
                  </Form.Item>
                )}
              />

              {permission === "PAUSED" && (
                <Form.Field
                  control={form.control}
                  name="permissionUntil"
                  render={({ field: { value, onChange } }) => (
                    <Form.Item>
                      <Form.Label>{t(`${KEY}.until`)}</Form.Label>
                      <Form.Control>
                        <DatePicker
                          value={value ?? undefined}
                          onChange={(date) => onChange(date ?? null)}
                          minValue={new Date()}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              )}

              <Form.Field
                control={form.control}
                name="hostile"
                render={({ field: { value, onChange, ...field } }) => (
                  <Form.Item>
                    <div className="flex items-start gap-x-3">
                      <Form.Control>
                        <Switch
                          {...field}
                          checked={value}
                          onCheckedChange={onChange}
                        />
                      </Form.Control>
                      <div className="flex flex-col">
                        <Form.Label>{t(`${KEY}.hostile`)}</Form.Label>
                        <Form.Hint>{t(`${KEY}.hostileHint`)}</Form.Hint>
                      </div>
                    </div>
                  </Form.Item>
                )}
              />

              <Form.Field
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t(`${KEY}.reason`)}</Form.Label>
                    <Form.Control>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={t(`${KEY}.reasonPlaceholder`)}
                      />
                    </Form.Control>
                    <Form.Hint>{t(`${KEY}.reasonHint`)}</Form.Hint>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button size="small" variant="secondary" type="button">
                  {t("actions.cancel")}
                </Button>
              </Drawer.Close>
              <Button
                size="small"
                type="submit"
                isLoading={update.isPending}
                disabled={!changed || update.isPending}
              >
                {t(`${KEY}.save`)}
              </Button>
            </Drawer.Footer>
          </form>
        </Form>
      </Drawer.Content>
    </Drawer>
  );
};
