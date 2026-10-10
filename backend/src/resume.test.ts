import { describe, expect, test } from "bun:test";
import { createShortResume, parseResumeRequest } from "./resume";

describe("resume API logic", () => {
  test("validates and trims linkedin text", () => {
    expect(parseResumeRequest({ linkedinText: "  Jane Doe  " })).toEqual({
      linkedinText: "Jane Doe",
    });
  });

  test("rejects an empty linkedin text", () => {
    expect(() => parseResumeRequest({ linkedinText: "  " })).toThrow(
      "linkedinText must be a non-empty string",
    );
  });

  test("creates a concise response from profile lines", () => {
    expect(
      createShortResume({
        linkedinText: "Jane Doe\n• Engineer\n- Built APIs\nAvailable for hire",
      }),
    ).toEqual({
      summary: "Jane Doe Engineer Built APIs Available for hire",
      highlights: ["Jane Doe", "Engineer", "Built APIs", "Available for hire"],
    });
  });
});
