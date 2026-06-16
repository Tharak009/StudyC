import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicRoute } from "../routes/public-route";
import { useAuthStore } from "../store/auth.store";

describe("PublicRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, initialized: true });
  });

  it("renders public content for signed-out users", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Login screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });
});
