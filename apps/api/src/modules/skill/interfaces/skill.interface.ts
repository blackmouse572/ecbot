import type { SkillStep } from '@repo/agent-blueprint';
import { ENUM_SKILL_FORMAT } from 'src/modules/skill/enums/skill-format.enum';

export type ISkillSource =
    | {
          format: ENUM_SKILL_FORMAT.CONTENT;
          guardrails: string[];
          steps: null;
          instructions: string;
      }
    | {
          format: ENUM_SKILL_FORMAT.STEPS;
          guardrails: string[];
          steps: SkillStep[];
          instructions: null;
      };
