import { describe, it, expect } from "vitest";
import {
  getAreaColor,
  getAreaLabel,
  getPriorityColor,
  getStatusInfo,
  AREAS,
  PRIORITIES,
  STATUSES,
} from "@/lib/supabase";

describe("getAreaColor", () => {
  it("returns the correct color for a known area", () => {
    expect(getAreaColor("obras")).toBe("#f59e0b");
    expect(getAreaColor("tech")).toBe("#60a5fa");
    expect(getAreaColor("analytics")).toBe("#a78bfa");
  });

  it("returns the default color for an unknown area", () => {
    expect(getAreaColor("unknown")).toBe("#94a3b8");
  });

  it("returns the correct color for all defined areas", () => {
    for (const area of AREAS) {
      expect(getAreaColor(area.value)).toBe(area.color);
    }
  });
});

describe("getAreaLabel", () => {
  it("returns the correct label for a known area", () => {
    expect(getAreaLabel("obras")).toBe("Obras & Espaço");
    expect(getAreaLabel("tech")).toBe("Tech & IT");
    expect(getAreaLabel("crm")).toBe("CRM & Digital");
  });

  it("returns the raw value for an unknown area", () => {
    expect(getAreaLabel("unknown")).toBe("unknown");
  });

  it("returns the correct label for all defined areas", () => {
    for (const area of AREAS) {
      expect(getAreaLabel(area.value)).toBe(area.label);
    }
  });
});

describe("getPriorityColor", () => {
  it("returns the correct color for a known priority", () => {
    expect(getPriorityColor("alta")).toBe("#ef4444");
    expect(getPriorityColor("media")).toBe("#f59e0b");
    expect(getPriorityColor("baixa")).toBe("#22c55e");
  });

  it("returns the default color for an unknown priority", () => {
    expect(getPriorityColor("unknown")).toBe("#f59e0b");
  });

  it("returns the correct color for all defined priorities", () => {
    for (const priority of PRIORITIES) {
      expect(getPriorityColor(priority.value)).toBe(priority.color);
    }
  });
});

describe("getStatusInfo", () => {
  it("returns the correct status info for a known status", () => {
    const pendente = getStatusInfo("pendente");
    expect(pendente.value).toBe("pendente");
    expect(pendente.label).toBe("Pendente");

    const emCurso = getStatusInfo("em-curso");
    expect(emCurso.value).toBe("em-curso");
    expect(emCurso.label).toBe("Em curso");
  });

  it("returns the first status as default for an unknown status", () => {
    const fallback = getStatusInfo("unknown");
    expect(fallback).toEqual(STATUSES[0]);
  });

  it("returns the correct info for all defined statuses", () => {
    for (const status of STATUSES) {
      const info = getStatusInfo(status.value);
      expect(info.value).toBe(status.value);
      expect(info.label).toBe(status.label);
    }
  });
});
