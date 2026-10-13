import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { DocumentPreviewModal } from "../components/resources/DocumentPreviewModal";
import { getPageScaleAndDimensions } from "../components/resources/PdfDocumentViewer";
import type { VaultResource } from "../components/resources/ResourceCard";
import { apiClient } from "../api/client";
import { resourcesApi } from "../api/resources.api";

// Mock apiClient
vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe("DocumentPreviewModal & DocumentContentRenderer", () => {
  const sampleResource: VaultResource = {
    id: "res-101",
    title: "Unit 4 Operating Systems Notes.docx",
    description: "Detailed course notes on memory management and virtual address space",
    subjectCode: "CS402",
    subjectName: "Operating Systems",
    dept: "Computer Science",
    semester: "Semester 4",
    category: "notes",
    format: "docx",
    fileSize: "1.2 MB",
    fileUrl: "/uploads/vault/sample.docx",
    downloadCount: 42,
    rating: 4.8,
    reviewCount: 12,
    tags: ["OS", "Memory", "Paging"],
    uploader: {
      name: "Alex Rivera",
      roll: "20CS104",
      dept: "CSE",
      isVerified: true
    },
    createdAt: "2026-10-09"
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders modal header with resource title and download option without auto downloading", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("download-url")) {
        return Promise.resolve({ data: { data: { downloadUrl: "/uploads/vault/sample.docx" } } });
      }
      return Promise.resolve({ data: new ArrayBuffer(8) });
    });

    const onDownload = vi.fn();
    const onClose = vi.fn();

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={onClose}
        onDownload={onDownload}
      />
    );

    expect(screen.getByText("Unit 4 Operating Systems Notes.docx")).toBeInTheDocument();
    expect(screen.getByText(/CS402/)).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
    expect(onDownload).not.toHaveBeenCalled();
  });

  it("handles loading and error state cleanly if file stream fails", async () => {
    (apiClient.get as any).mockRejectedValue(new Error("Network timeout loading document"));

    const onDownload = vi.fn();
    const onClose = vi.fn();

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={onClose}
        onDownload={onDownload}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to Render Preview")).toBeInTheDocument();
    });

    expect(screen.getByText(/Network timeout loading document/)).toBeInTheDocument();
  });

  it("opens Find toolbar on button click or Ctrl+F and filters matching document sections", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("download-url")) {
        return Promise.resolve({ data: { data: { downloadUrl: "/uploads/vault/sample.docx" } } });
      }
      return Promise.resolve({ data: new ArrayBuffer(8) });
    });

    const onDownload = vi.fn();
    const onClose = vi.fn();

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={onClose}
        onDownload={onDownload}
      />
    );

    // Find button should be visible in toolbar
    const findButton = screen.getAllByTitle("Find text in document (Ctrl+F)")[0];
    expect(findButton).toBeInTheDocument();
    fireEvent.click(findButton);

    // Search input should now be visible
    const searchInput = screen.getByPlaceholderText(/find in document/i);
    expect(searchInput).toBeInTheDocument();

    // Type "hyperledger" into search input
    fireEvent.change(searchInput, { target: { value: "hyperledger" } });
    expect(searchInput).toHaveValue("hyperledger");

    // Close search with Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/find in document/i)).not.toBeInTheDocument();
  });

  it("displays zero matches message when search term yields no results", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("download-url")) {
        return Promise.resolve({ data: { data: { downloadUrl: "/uploads/vault/sample.docx" } } });
      }
      return Promise.resolve({ data: new ArrayBuffer(8) });
    });

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    const findButton = screen.getAllByTitle("Find text in document (Ctrl+F)")[0];
    fireEvent.click(findButton);

    const searchInput = screen.getByPlaceholderText(/find in document/i);
    fireEvent.change(searchInput, { target: { value: "nonexistentquery12345" } });

    await waitFor(() => {
      expect(screen.getByText('No matches found for "nonexistentquery12345"')).toBeInTheDocument();
    });
  });

  it("submits rating successfully and triggers onRatingSuccess with updated resource", async () => {
    (apiClient.get as any).mockImplementation(() => Promise.resolve({ data: new ArrayBuffer(8) }));
    vi.spyOn(resourcesApi, "rate").mockResolvedValue({
      _id: "res-101",
      title: "Unit 4 Operating Systems Notes.docx",
      rating: 5.0,
      reviewCount: 13,
      downloadCount: 42
    } as any);

    const onRatingSuccess = vi.fn();

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={vi.fn()}
        onDownload={vi.fn()}
        onRatingSuccess={onRatingSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/optional review note/i);
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(resourcesApi.rate).toHaveBeenCalledWith("res-101", 5, "");
      expect(onRatingSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5.0, reviewCount: 13 })
      );
    });
  });

  it("handles failed rating submission cleanly without calling onRatingSuccess", async () => {
    (apiClient.get as any).mockImplementation(() => Promise.resolve({ data: new ArrayBuffer(8) }));
    vi.spyOn(resourcesApi, "rate").mockRejectedValue(new Error("Server rating failed"));

    const onRatingSuccess = vi.fn();

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={vi.fn()}
        onDownload={vi.fn()}
        onRatingSuccess={onRatingSuccess}
      />
    );

    const input = screen.getByPlaceholderText(/optional review note/i);
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(resourcesApi.rate).toHaveBeenCalledWith("res-101", 5, "");
      expect(onRatingSuccess).not.toHaveBeenCalled();
    });
  });

  describe("getPageScaleAndDimensions layout tests", () => {
    it("correctly calculates fitMode width to fit available container width", () => {
      // 600x800 page in 1000x800 container (availW - 32 = 968)
      const dims = getPageScaleAndDimensions(600, 800, "width", 100, 1000, 800);
      expect(dims.width).toBe(968);
      expect(dims.scale).toBeCloseTo(968 / 600, 2);
    });

    it("correctly calculates fitMode page ensuring vertical clearance within container", () => {
      // 600x800 page in 1000x800 container (availH - 56 = 744, availW - 32 = 968)
      const dims = getPageScaleAndDimensions(600, 800, "page", 100, 1000, 800);
      expect(dims.height).toBeLessThanOrEqual(744);
      expect(dims.width).toBeLessThanOrEqual(968);
      expect(dims.scale).toBeCloseTo(744 / 800, 2);
    });

    it("scales proportionally with zoomLevel in both modes", () => {
      const normal = getPageScaleAndDimensions(600, 800, "width", 100, 1000, 800);
      const zoomed = getPageScaleAndDimensions(600, 800, "width", 150, 1000, 800);
      expect(zoomed.scale).toBeCloseTo(normal.scale * 1.5, 2);
    });
  });
});



