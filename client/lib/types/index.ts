export type CodeFile = {
  id: string;
  name: string;
  language: string;
};

export type AssistantRequest = {
  question: string;
  code: string;
  language: string;
};

export type AssistantResponse = {
  answer: string;
};
