import { describe, expect, it } from "vitest";
import { validateSignUp } from "./auth";

const valid = { name: "Natasha", email: "natasha@example.com", password: "a-strong-pass", confirm: "a-strong-pass", terms: true };

describe("validateSignUp", () => {
  it("accepts valid input", () => {
    expect(validateSignUp(valid)).toEqual({});
  });
  it("reports each problem", () => {
    const errors = validateSignUp({ name: "N", email: "nope", password: "short", confirm: "x", terms: false });
    expect(Object.keys(errors).sort()).toEqual(["confirm", "email", "name", "password", "terms"]);
  });
  it("enforces the 128 character limit", () => {
    const long = "x".repeat(129);
    expect(validateSignUp({ ...valid, password: long, confirm: long }).password).toBeDefined();
  });
});
