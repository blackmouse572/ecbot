import {
  IconBarbell,
  IconBook,
  IconBuildingSkyscraper,
  IconCar,
  IconCurrencyDollar,
  IconDeviceDesktop,
  IconDots,
  IconHeartbeat,
  IconMassage,
  IconMusic,
  IconPlane,
  IconShirt,
  IconShoppingCart,
  IconToolsKitchen2,
} from "@tabler/icons-react";

/** Tabler icons addressable by the `icon` name stored in CHATBOT_TYPE_CONFIG. */
export const CHATBOT_TYPE_ICON_COMPONENTS = {
  IconBook,
  IconBuildingSkyscraper,
  IconCar,
  IconCurrencyDollar,
  IconDeviceDesktop,
  IconDots,
  IconBarbell,
  IconToolsKitchen2,
  IconHeartbeat,
  IconMusic,
  IconPlane,
  IconShirt,
  IconShoppingCart,
  IconMassage,
};

export type ChatbotTypeIconName = keyof typeof CHATBOT_TYPE_ICON_COMPONENTS;
