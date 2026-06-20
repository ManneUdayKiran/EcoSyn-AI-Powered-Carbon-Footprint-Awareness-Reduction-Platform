import { expect, test } from "vitest";
import { extractErrorMessage } from "./client";

test("extracts API, network, and fallback error messages", () => {
  expect(extractErrorMessage({ response: { data: { error: "Invalid request" } } })).toBe("Invalid request");
  expect(extractErrorMessage({ message: "Network Error" })).toBe("Network Error");
  expect(extractErrorMessage({})).toBe("Something went wrong. Please try again.");
});
