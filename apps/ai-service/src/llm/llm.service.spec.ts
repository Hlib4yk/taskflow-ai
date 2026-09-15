const mockMessagesCreate = jest.fn();
const mockMessagesStream = jest.fn();

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate, stream: mockMessagesStream },
  })),
}));

import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { LlmService } from "./llm.service";

describe("LlmService", () => {
  let service: LlmService;

  beforeEach(async () => {
    mockMessagesCreate.mockReset();
    mockMessagesStream.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => "sk-ant-test", get: () => undefined },
        },
      ],
    }).compile();

    service = module.get(LlmService);
  });

  describe("generateSubtasks", () => {
    it("parses a JSON array of subtasks from the model response", async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: "text", text: '["Write tests", "Ship it"]' }],
      });

      const result = await service.generateSubtasks("Launch v2", []);

      expect(result).toEqual(["Write tests", "Ship it"]);
    });

    it("falls back to the raw text when the model doesn't return valid JSON", async () => {
      mockMessagesCreate.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });

      const result = await service.generateSubtasks("Launch v2", []);

      expect(result).toEqual(["not json"]);
    });

    it("returns an empty list when the response has no text block", async () => {
      mockMessagesCreate.mockResolvedValue({ content: [] });

      const result = await service.generateSubtasks("Launch v2", []);

      expect(result).toEqual([]);
    });
  });

  describe("streamChatReply", () => {
    it("yields only the text deltas from the stream", async () => {
      async function* fakeStream() {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hel" } };
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "lo" } };
        yield { type: "message_stop" };
      }
      mockMessagesStream.mockReturnValue(fakeStream());

      const tokens: string[] = [];
      for await (const token of service.streamChatReply("hi", [])) tokens.push(token);

      expect(tokens).toEqual(["Hel", "lo"]);
    });
  });
});
