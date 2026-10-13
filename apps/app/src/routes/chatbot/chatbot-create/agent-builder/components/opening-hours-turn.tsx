import { readAnswer, type AgentProfile, type OpeningHours, type Question } from "@repo/agent-blueprint";
import { Text } from "@medusajs/ui";
import {
  Message, MessageContent, Questionnaire, QuestionnaireActions, QuestionnaireNext, QuestionnaireProgress,
  QuestionnaireSkip,
} from "@repo/ui/common-components";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { minutesLeft } from "../builder-state";
import { fromOpeningWeek, toOpeningWeek } from "../opening-hours-form";
import { OpeningHoursEditor } from "./opening-hours-editor";

type Props = {
  question: Question;
  profile: AgentProfile;
  position: { current: number; total: number };
  onAnswer: (value: OpeningHours | undefined) => void;
  onSkip: () => void;
};

/** The weekly opening hours question (#289), a per-day editor instead of choices or text. */
export const OpeningHoursTurn: FC<Props> = ({ question, profile, position, onAnswer, onSkip }) => {
  const { t } = useTranslation();
  const [week, setWeek] = useState(() => toOpeningWeek(readAnswer(profile, question.path) as OpeningHours | undefined));
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const hours = fromOpeningWeek(week);
    setInvalid(hours === null);
    if (hours !== null) onAnswer(hours);
  };

  return (
    <>
      <Message from="assistant">
        <MessageContent>{t(question.askKey)}</MessageContent>
      </Message>
      <Message from="user" variant="outline" className="w-full">
        <MessageContent className="w-full max-w-full">
          <Questionnaire onSubmit={submit}>
            <Text size="small" weight="plus">{t(question.leadKey)}</Text>
            <fieldset aria-invalid={invalid || undefined} className="flex min-w-0 flex-col gap-2">
              <legend className="sr-only">{t(question.titleKey)}</legend>
              <OpeningHoursEditor value={week} onChange={(next) => { setWeek(next); setInvalid(false); }} />
              {invalid && <Text size="small" role="alert" className="text-ui-fg-error">{t("agentBuilder.ui.hoursInvalid")}</Text>}
            </fieldset>
            <QuestionnaireProgress
              current={position.current}
              total={position.total}
              render={(p) => t("agentBuilder.ui.progress", { ...p, minutes: minutesLeft(p) })}
            />
            <QuestionnaireActions>
              <QuestionnaireSkip onClick={onSkip}>{t("actions.skip")}</QuestionnaireSkip>
              <QuestionnaireNext>{t("actions.next")}</QuestionnaireNext>
            </QuestionnaireActions>
          </Questionnaire>
        </MessageContent>
      </Message>
    </>
  );
};
