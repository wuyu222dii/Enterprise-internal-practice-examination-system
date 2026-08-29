import { describe, expect, it } from "vitest";
import { flows, pageRegistry } from "../src/registry";

describe("prototype registry", () => {
  it("registers all 33 unique PRD pages", () => {
    expect(pageRegistry).toHaveLength(33);
    expect(new Set(pageRegistry.map((page) => page.id)).size).toBe(33);
    expect(pageRegistry.filter((page) => page.surface === "mini")).toHaveLength(
      12,
    );
    expect(pageRegistry.filter((page) => page.surface === "exam")).toHaveLength(
      5,
    );
    expect(
      pageRegistry.filter((page) => page.surface === "admin"),
    ).toHaveLength(16);
  });

  it("gives every page at least one deterministic scenario and trace reference", () => {
    for (const page of pageRegistry) {
      expect(page.scenarios.length, page.id).toBeGreaterThan(0);
      expect(page.fr.length, page.id).toBeGreaterThan(0);
      expect(page.acceptance.length, page.id).toBeGreaterThan(0);
    }
  });

  it("registers eight valid end-to-end flows", () => {
    const pageIds = new Set(pageRegistry.map((page) => page.id));
    expect(flows).toHaveLength(8);
    for (const flow of flows) {
      expect(flow.steps.length, flow.id).toBeGreaterThan(1);
      for (const step of flow.steps) {
        expect(pageIds.has(step.pageId), `${flow.id}:${step.pageId}`).toBe(
          true,
        );
        const page = pageRegistry.find(
          (candidate) => candidate.id === step.pageId,
        );
        expect(
          page?.scenarios.some((scenario) => scenario.id === step.scenario),
          `${flow.id}:${step.pageId}:${step.scenario}`,
        ).toBe(true);
      }
    }
  });
});
