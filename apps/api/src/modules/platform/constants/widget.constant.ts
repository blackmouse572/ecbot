// Shown at the top of the website widget when the owner skipped the greeting
// step, so a visitor never opens an empty window. Keyed by the chatbot's
// primaryLanguage; any other language gets WIDGET_DEFAULT_WELCOME_LANGUAGE.
export const WIDGET_DEFAULT_WELCOME: Record<string, string> = {
    vi: 'Xin chào! Mình có thể giúp gì cho bạn?',
    en: 'Hi there! How can I help you?',
};

export const WIDGET_DEFAULT_WELCOME_LANGUAGE = 'en';
