import { describe, expect, it } from "vitest";
import { initiateUploadSchema, rateResourceSchema } from "../src/validators/resource.validator.js";
import { mapApiResourceToVaultResource } from "../../web/src/pages/connections-resources.page.js";

describe("Resource Vault Data Integrity & Metadata Unit Suite", () => {
  it("validates initiateUploadSchema accepts department, semester, and subjectCode", () => {
    const payload = {
      fileName: "blockchain_notes.pdf",
      fileSize: 5242880,
      mimeType: "application/pdf",
      totalParts: 1,
      title: "UNIT 1 Blockchain Notes",
      description: "Notes for Sem 3 CSE",
      category: "NOTES",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 3",
      subjectCode: "AI301",
      visibility: "COMMUNITY",
      tags: ["blockchain"]
    };

    const parsed = initiateUploadSchema.safeParse({ params: {}, body: payload });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.body.department).toBe("Artificial Intelligence & Data Science");
      expect(parsed.data.body.semester).toBe("Sem 3");
      expect(parsed.data.body.subjectCode).toBe("AI301");
    }
  });

  it("validates rateResourceSchema accepts rating between 1 and 5 and reviewText", () => {
    const valid = rateResourceSchema.safeParse({
      params: { resourceId: "650000000000000000000001" },
      body: { rating: 5, reviewText: "Excellent notes!" }
    });
    expect(valid.success).toBe(true);

    const invalidRating = rateResourceSchema.safeParse({
      params: { resourceId: "650000000000000000000001" },
      body: { rating: 6 }
    });
    expect(invalidRating.success).toBe(false);
  });

  it("maps API resource item to VaultResource preserving department, semester, and rating", () => {
    const apiItem = {
      _id: "res_999",
      title: "Raft Consensus Algorithm",
      description: "Distributed Systems",
      fileName: "raft.pdf",
      fileUrl: "/uploads/raft.pdf",
      fileSize: 1048576,
      fileType: "application/pdf",
      category: "NOTES",
      department: "Artificial Intelligence & Data Science",
      semester: "Sem 6",
      subjectCode: "CS602",
      format: "pdf",
      rating: 4.8,
      reviewCount: 12,
      downloadCount: 45,
      uploadedBy: {
        _id: "user_123",
        fullName: "Jane Doe",
        rollNumber: "AI22-045",
        department: "Artificial Intelligence & Data Science"
      }
    };

    const vaultRes = mapApiResourceToVaultResource(apiItem);
    expect(vaultRes.id).toBe("res_999");
    expect(vaultRes.dept).toBe("Artificial Intelligence & Data Science");
    expect(vaultRes.semester).toBe("Sem 6");
    expect(vaultRes.subjectCode).toBe("CS602");
    expect(vaultRes.rating).toBe(4.8);
    expect(vaultRes.reviewCount).toBe(12);
  });

  it("does not infer or fabricate department when resource has no department value", () => {
    const apiItemWithoutDept = {
      _id: "res_no_dept",
      title: "General Reading",
      fileName: "reading.pdf",
      fileUrl: "/uploads/reading.pdf",
      fileSize: 1024,
      fileType: "application/pdf",
      category: "OTHER",
      uploadedBy: {
        _id: "user_789",
        fullName: "Bob Smith",
        rollNumber: "ME21-001",
        department: "Mechanical Engineering"
      }
    };

    const vaultRes = mapApiResourceToVaultResource(apiItemWithoutDept);
    // Must NOT infer from uploadedBy.department ("Mechanical Engineering")
    // and must NOT fallback to "Computer Science & Engineering"
    expect(vaultRes.dept).toBe("");
  });
});
