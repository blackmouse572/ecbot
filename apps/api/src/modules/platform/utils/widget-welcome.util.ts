import {
    WIDGET_DEFAULT_WELCOME,
    WIDGET_DEFAULT_WELCOME_LANGUAGE,
} from '../constants/widget.constant';

/**
 * The widget's greeting: the owner's own welcome message, else the default in
 * the chatbot's language.
 */
export function widgetWelcomeText(chatbot: {
    welcomeMessage?: string | null;
    primaryLanguage?: string | null;
}): string {
    return (
        chatbot.welcomeMessage?.trim() ||
        WIDGET_DEFAULT_WELCOME[chatbot.primaryLanguage ?? ''] ||
        WIDGET_DEFAULT_WELCOME[WIDGET_DEFAULT_WELCOME_LANGUAGE]
    );
}
