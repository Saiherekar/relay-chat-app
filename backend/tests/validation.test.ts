import { describe, it, expect } from "vitest";
import { sendMessageSchema } from "../validations/chatValidation";

describe("send message validation", () => {
  it("accepts a normal message", () =>
    expect(
      sendMessageSchema.validate({
        body: { text: "Hello" },
        params: { chatId: "ch_123" },
        query: {},
      }).error,
    ).toBeUndefined());
  it("rejects an empty message", () =>
    expect(
      sendMessageSchema.validate({
        body: { text: " " },
        params: { chatId: "ch_123" },
        query: {},
      }).error,
    ).toBeDefined());
  it("rejects messages over 5000 characters", () =>
    expect(
      sendMessageSchema.validate({
        body: { text: "x".repeat(5001) },
        params: { chatId: "ch_123" },
        query: {},
      }).error,
    ).toBeDefined());
});
