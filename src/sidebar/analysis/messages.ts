import type { MessageFromWebview, SortOrder } from "./types";
import type { Verdict } from "../../core/scoring";

export interface AnalysisMessageHandlers {
  runScan: () => void;
  setSearch: (value: string) => void;
  setSeverity: (value: Verdict[]) => void;
  setSort: (value: SortOrder) => void;
  clearFilters: () => void;
  selectIssue: (id: string) => void;
  openIssueDetail: (id: string) => void;
  selectFile: (uri: string) => void;
  setFileExpansion: (uri: string, expanded: boolean) => void;
  openFileDetail: (uri: string) => void;
  closeDetail: () => void;
  openFile: (payload: {
    uri: string;
    start: { line: number; character: number };
    end: { line: number; character: number };
  }) => void;
  openDocs: (url?: string) => void;
  askGemini: (payload: {
    issue: string;
    feature: string;
    filePath: string;
    findingId: string;
    context: "sidebar" | string;
  }) => void;
  askGeminiFollowUp: (payload: {
    question: string;
    findingId: string;
    feature: string;
    filePath: string;
    target: string;
  }) => void;
  copyCodeSnippet: (code: string) => void;
}

export function processMessage(handlers: AnalysisMessageHandlers, message: MessageFromWebview): void {
  switch (message.type) {
    case "scan":
      handlers.runScan();
      break;
    case "setSearch":
      handlers.setSearch(message.value);
      break;
    case "setSeverity":
      handlers.setSeverity(message.value);
      break;
    case "setSort":
      handlers.setSort(message.value);
      break;
    case "clearFilters":
      handlers.clearFilters();
      break;
    case "selectIssue":
      handlers.selectIssue(message.id);
      break;
    case "openIssueDetail":
      handlers.openIssueDetail(message.id);
      break;
    case "selectFile":
      handlers.selectFile(message.uri);
      break;
    case "setFileExpansion":
      handlers.setFileExpansion(message.uri, message.expanded);
      break;
    case "openFileDetail":
      handlers.openFileDetail(message.uri);
      break;
    case "closeDetail":
      handlers.closeDetail();
      break;
    case "openFile":
      handlers.openFile({ uri: message.uri, start: message.start, end: message.end });
      break;
    case "openDocs":
      handlers.openDocs(message.url);
      break;
    case "askGemini":
      handlers.askGemini({
        issue: message.issue,
        feature: message.feature,
        filePath: message.filePath,
        findingId: message.findingId,
        context: "sidebar"
      });
      break;
    case "askGeminiFollowUp":
      handlers.askGeminiFollowUp({
        question: message.question,
        findingId: message.findingId,
        feature: message.feature,
        filePath: message.filePath,
        target: message.target
      });
      break;
    case "copyCodeSnippet":
      handlers.copyCodeSnippet(message.code);
      break;
    default:
      break;
  }
}
