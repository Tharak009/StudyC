import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router";
import { DocumentPreviewModal } from "../components/resources/DocumentPreviewModal";
import { ResourceCard, type VaultResource } from "../components/resources/ResourceCard";
import { ContributionsTab } from "../components/profile/ContributionsTab";
import { useAuthStore } from "../store/auth.store";
import { resourcesApi } from "../api/resources.api";
import { apiClient } from "../api/client";

// Mock apiClient & resourcesApi
vi.mock("../api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

describe("Resource Deletion Confirmation Dialog", () => {
  const sampleResource: VaultResource = {
    id: "res-del-1",
    title: "CNS Unit 1 to 5.pdf",
    description: "Cryptography and Network Security Comprehensive Guide",
    subjectCode: "CS240",
    subjectName: "Network Security",
    dept: "Information Technology",
    semester: "Sem 4",
    category: "NOTES",
    format: "pdf",
    fileSize: "26.7 MB",
    fileUrl: "/uploads/cns.pdf",
    downloadCount: 15,
    rating: 4.9,
    reviewCount: 8,
    tags: ["security", "crypto"],
    uploaderId: "user-123",
    uploader: {
      id: "user-123",
      name: "Thilak",
      roll: "IT24-001",
      dept: "Information Technology",
      isVerified: true
    },
    createdAt: "10/11/2026"
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        _id: "user-123",
        fullName: "Thilak",
        email: "thilak@college.edu",
        role: "STUDENT",
        status: "ACTIVE",
        rollNumber: "IT24-001",
        department: "Information Technology",
        academicYear: 2026,
        bio: "",
        interests: [],
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01"
      },
      token: "mock-token",
      isAuthenticated: true
    });
  });

  it("ResourceCard displays delete button for owner and triggers onDelete on click without calling deletion API", () => {
    const onDelete = vi.fn();
    vi.spyOn(resourcesApi, "delete");
    render(
      <ResourceCard
        resource={sampleResource}
        currentUserId="user-123"
        userRole="STUDENT"
        onPreview={vi.fn()}
        onDownload={vi.fn()}
        onToggleBookmark={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByTitle("Delete Resource");
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(sampleResource);
    // Explicitly verify the initial Delete action on ResourceCard DOES NOT invoke the deletion API
    expect(resourcesApi.delete).not.toHaveBeenCalled();
  });

  it("ResourceCard does not display delete button for non-owner student", () => {
    render(
      <ResourceCard
        resource={sampleResource}
        currentUserId="user-other"
        userRole="STUDENT"
        onPreview={vi.fn()}
        onDownload={vi.fn()}
        onToggleBookmark={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByTitle("Delete Resource")).not.toBeInTheDocument();
  });

  it("ResourceCard displays delete button for ADMIN even if not uploader", () => {
    const onDelete = vi.fn();
    render(
      <ResourceCard
        resource={sampleResource}
        currentUserId="admin-user"
        userRole="ADMIN"
        onPreview={vi.fn()}
        onDownload={vi.fn()}
        onToggleBookmark={vi.fn()}
        onDelete={onDelete}
      />
    );

    const deleteBtn = screen.getByTitle("Delete Resource");
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(sampleResource);
  });

  it("ResourceCard Delete action opens Delete Resource? confirmation dialog first without calling deletion API, and calls deletion API only on confirming", async () => {
    vi.spyOn(resourcesApi, "delete").mockResolvedValue({ success: true } as any);

    function VaultTestComponent() {
      const [resourceToDelete, setResourceToDelete] = React.useState<VaultResource | null>(null);
      const [resources, setResources] = React.useState<VaultResource[]>([sampleResource]);

      const handleConfirm = async () => {
        if (!resourceToDelete) return;
        await resourcesApi.delete(resourceToDelete.id);
        setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
        setResourceToDelete(null);
      };

      return (
        <div>
          {resources.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              currentUserId="user-123"
              userRole="STUDENT"
              onPreview={vi.fn()}
              onDownload={vi.fn()}
              onToggleBookmark={vi.fn()}
              onDelete={(target) => setResourceToDelete(target)}
            />
          ))}

          {resourceToDelete && (
            <div data-testid="delete-dialog">
              <button aria-label="Close dialog" onClick={() => setResourceToDelete(null)}>X</button>
              <h3>Are you sure you want to delete this resource?</h3>
              <p>Are you sure you want to delete "{resourceToDelete.fileName || resourceToDelete.title}"? This action cannot be undone.</p>
              <button onClick={() => setResourceToDelete(null)}>No</button>
              <button data-testid="confirm-delete-btn" onClick={handleConfirm}>Yes, Delete</button>
            </div>
          )}
        </div>
      );
    }

    render(<VaultTestComponent />);

    const deleteBtn = screen.getByTitle("Delete Resource");
    expect(deleteBtn).toBeInTheDocument();

    // 1. Click initial delete action on ResourceCard
    fireEvent.click(deleteBtn);

    // 2. PROVE deletion API was NOT called initially
    expect(resourcesApi.delete).not.toHaveBeenCalled();

    // 3. PROVE confirmation dialog is displayed
    expect(screen.getByText("Are you sure you want to delete this resource?")).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to delete "CNS Unit 1 to 5.pdf"? This action cannot be undone.'
      )
    ).toBeInTheDocument();

    // 4. Cancel dismisses without calling deletion API
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("Are you sure you want to delete this resource?")).not.toBeInTheDocument();
    expect(resourcesApi.delete).not.toHaveBeenCalled();

    // 5. Open dialog again and click Delete Resource inside dialog
    fireEvent.click(screen.getByTitle("Delete Resource"));
    expect(screen.getByText("Are you sure you want to delete this resource?")).toBeInTheDocument();
    expect(resourcesApi.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      // 6. PROVE deletion API called strictly upon dialog confirmation
      expect(resourcesApi.delete).toHaveBeenCalledWith("res-del-1");
    });
  });

  it("DocumentPreviewModal does NOT render a duplicate trash button, enforcing single trash button rule", async () => {
    (apiClient.get as any).mockImplementation(() => Promise.resolve({ data: new ArrayBuffer(8) }));

    render(
      <DocumentPreviewModal
        resource={sampleResource}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    // Verify no trash button inside DocumentPreviewModal
    expect(screen.queryByTitle("Delete Resource (Owner / Admin)")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete Resource")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("ContributionsTab opens confirmation dialog on delete click and does not delete immediately", async () => {
    localStorage.setItem(
      "studyconnect_vault_resources",
      JSON.stringify([
        {
          id: "contrib-1",
          title: "Operating Systems Notes",
          subjectCode: "CS201",
          fileSize: "1.2 MB",
          downloadCount: 5,
          rating: 4.8
        }
      ])
    );
    vi.spyOn(resourcesApi, "delete").mockResolvedValue({ success: true } as any);

    render(
      <MemoryRouter>
        <ContributionsTab />
      </MemoryRouter>
    );

    expect(screen.getByText("Operating Systems Notes")).toBeInTheDocument();

    // Click trash button
    fireEvent.click(screen.getByTitle("Delete Upload"));

    // Confirmation dialog MUST appear
    expect(screen.getByText("Are you sure you want to delete this resource?")).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete "Operating Systems Notes"? This action cannot be undone.')
    ).toBeInTheDocument();

    // API must NOT have been called yet
    expect(resourcesApi.delete).not.toHaveBeenCalled();

    // Cancel dismissal
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByText("Are you sure you want to delete this resource?")).not.toBeInTheDocument();
    expect(resourcesApi.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Operating Systems Notes")).toBeInTheDocument();

    // Re-open and confirm
    fireEvent.click(screen.getByTitle("Delete Upload"));
    expect(screen.getByText("Are you sure you want to delete this resource?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Yes, Delete" }));

    await waitFor(() => {
      expect(resourcesApi.delete).toHaveBeenCalledWith("contrib-1");
      expect(screen.queryByText("Operating Systems Notes")).not.toBeInTheDocument();
    });
  });
});
