import { registerSchema } from "../src/validators/auth.validator.js";
import { updateProfileSchema } from "../src/validators/user.validator.js";

describe("request validation", () => {
  it("requires a strong registration password", () => {
    const parsed = registerSchema.safeParse({
      body: {
        fullName: "Student Name",
        rollNumber: "A-1",
        department: "Science",
        academicYear: 1,
        email: "student@college.edu",
        password: "password"
      }
    });

    expect(parsed.success).toBe(false);
  });

  it("deduplicates profile interests", () => {
    const parsed = updateProfileSchema.parse({
      body: { interests: ["React", "React", "Systems"] }
    });

    expect(parsed.body.interests).toEqual(["React", "Systems"]);
  });
});
