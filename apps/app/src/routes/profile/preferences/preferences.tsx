import {
  PreferenceGeneralSection,
  PreferenceNotificationSection,
} from "./components";

export const Preferences = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <PreferenceGeneralSection />
      <PreferenceNotificationSection />
    </div>
  );
};
