import { useTheme } from "@/providers/theme-provider";
import { ComputerDesktopSolid, MoonSolid, SunSolid } from "@medusajs/icons";
import { Select } from "@medusajs/ui";

export function DebugThemeExtension() {
  const { setTheme, theme } = useTheme();

  return (
    <Select defaultValue={theme}>
      <Select.Trigger className="w-full">
        <Select.Value placeholder="Select theme" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="default" onClick={() => setTheme("system")}>
          <div className="flex items-center gap-3">
            <ComputerDesktopSolid />
            Default
          </div>
        </Select.Item>
        <Select.Item value="dark" onClick={() => setTheme("dark")}>
          <div className="flex items-center gap-3">
            <MoonSolid />
            Dark
          </div>
        </Select.Item>
        <Select.Item value="light" onClick={() => setTheme("light")}>
          <div className="flex items-center gap-3">
            <SunSolid />
            Light
          </div>
        </Select.Item>
      </Select.Content>
    </Select>
  );
}
