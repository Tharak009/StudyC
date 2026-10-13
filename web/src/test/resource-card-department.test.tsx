import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import React from "react";
import { ResourceCard, type VaultResource } from "../components/resources/ResourceCard";

describe("ResourceCard Department Badge Component Verification", () => {
  const baseResource: VaultResource = {
    id: "res-test-1",
    title: "CNS Unit 1 to 5",
    description: "Cryptography and Network Security Comprehensive Guide",
    subjectCode: "CS240",
    subjectName: "Network Security",
    dept: "Information Technology",
    semester: "Sem 4",
    category: "NOTES",
    format: "pdf",
    fileSize: "3.5 MB",
    fileUrl: "/uploads/cns.pdf",
    downloadCount: 15,
    rating: 4.9,
    reviewCount: 8,
    tags: ["security", "crypto"],
    uploader: {
      name: "Student Tester",
      roll: "IT24-001",
      dept: "Information Technology",
      isVerified: true
    },
    createdAt: "10/11/2026"
  };

  beforeEach(() => {
    cleanup();
  });

  it("displays the exact saved department badge on the resource card", () => {
    render(
      <ResourceCard
        resource={baseResource}
        onPreview={() => {}}
        onDownload={() => {}}
        onToggleBookmark={() => {}}
      />
    );

    // Verify format, subject code, semester, and department are present
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("CS240")).toBeInTheDocument();
    expect(screen.getByText("Sem 4")).toBeInTheDocument();
    expect(screen.getByText("Information Technology")).toBeInTheDocument();
  });

  it("displays different department badge for Computer Science & Engineering", () => {
    const csResource: VaultResource = {
      ...baseResource,
      id: "res-test-2",
      title: "Unit-IV & V MEFA",
      subjectCode: "CS246",
      format: "pptx",
      dept: "Computer Science & Engineering"
    };

    render(
      <ResourceCard
        resource={csResource}
        onPreview={() => {}}
        onDownload={() => {}}
        onToggleBookmark={() => {}}
      />
    );

    expect(screen.getByText("PPTX")).toBeInTheDocument();
    expect(screen.getByText("CS246")).toBeInTheDocument();
    expect(screen.getByText("Sem 4")).toBeInTheDocument();
    expect(screen.getByText("Computer Science & Engineering")).toBeInTheDocument();
  });

  it("displays neutral 'Department unavailable' badge without fabricating when department is empty", () => {
    const noDeptResource: VaultResource = {
      ...baseResource,
      id: "res-test-3",
      title: "Uncategorized Reference",
      dept: ""
    };

    render(
      <ResourceCard
        resource={noDeptResource}
        onPreview={() => {}}
        onDownload={() => {}}
        onToggleBookmark={() => {}}
      />
    );

    expect(screen.getByText("Department unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Information Technology")).not.toBeInTheDocument();
    expect(screen.queryByText("Computer Science & Engineering")).not.toBeInTheDocument();
  });
});
