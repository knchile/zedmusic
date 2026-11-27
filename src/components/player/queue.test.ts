import { describe, expect, it } from "vitest";
import { currentIndex, cycleRepeat, identityOrder, nextPosition, previousPosition, shuffledOrder } from "./queue";

const q = (over: Partial<Parameters<typeof nextPosition>[0]> = {}) => ({ length: 3, order: [0, 1, 2], position: 0, repeat: "off" as const, ...over });

describe("player queue", () => {
  it("advances and stops at the end when repeat is off", () => {
    expect(nextPosition(q(), "auto")).toBe(1);
    expect(nextPosition(q({ position: 2 }), "auto")).toBeNull();
  });
  it("wraps with repeat all", () => {
    expect(nextPosition(q({ position: 2, repeat: "all" }), "auto")).toBe(0);
  });
  it("repeats the same track with repeat one, but manual next still advances", () => {
    expect(nextPosition(q({ position: 1, repeat: "one" }), "auto")).toBe(1);
    expect(nextPosition(q({ position: 1, repeat: "one" }), "manual")).toBe(2);
  });
  it("previous restarts after 3 seconds, otherwise goes back", () => {
    expect(previousPosition(q({ position: 1 }), 10)).toEqual({ position: 1, restart: true });
    expect(previousPosition(q({ position: 1 }), 1)).toEqual({ position: 0, restart: false });
    expect(previousPosition(q({ position: 0 }), 1)).toEqual({ position: 0, restart: true });
    expect(previousPosition(q({ position: 0, repeat: "all" }), 1)).toEqual({ position: 2, restart: false });
  });
  it("shuffle keeps the current track first and is a permutation", () => {
    const order = shuffledOrder(10, 4);
    expect(order[0]).toBe(4);
    expect([...order].sort((a, b) => a - b)).toEqual(identityOrder(10));
  });
  it("handles an empty queue", () => {
    expect(currentIndex({ length: 0, order: [], position: 0, repeat: "off" })).toBeNull();
    expect(nextPosition({ length: 0, order: [], position: 0, repeat: "all" }, "manual")).toBeNull();
  });
  it("cycles repeat modes", () => {
    expect(cycleRepeat("off")).toBe("all");
    expect(cycleRepeat("all")).toBe("one");
    expect(cycleRepeat("one")).toBe("off");
  });
});
