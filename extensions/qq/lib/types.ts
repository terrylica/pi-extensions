import type { SubagentUsage } from "../../subagents/lib/types";

export const QQ_MESSAGE_TYPE = "qq";

export type QqDetails = {
  question: string;
  answer: string;
  provider: string;
  model: string;
  timestamp: number;
  usage?: SubagentUsage;
  runId?: string;
  totalDurationMs?: number;
};
