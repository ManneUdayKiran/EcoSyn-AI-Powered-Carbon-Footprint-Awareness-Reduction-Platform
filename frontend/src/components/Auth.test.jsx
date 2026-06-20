import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../api/client";
import Auth from "./Auth";

vi.mock("../api/client", () => ({
  api: { post: vi.fn() },
  extractErrorMessage: (error) => error.message || "Request failed"
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("validates an empty login form", () => {
  const { container } = render(<Auth onAuthSuccess={vi.fn()} />);

  fireEvent.submit(container.querySelector("form"));

  expect(screen.getByText(/fill in all required fields/i)).toBeVisible();
});

test("shows and hides the password using an accessible control", async () => {
  const { container } = render(<Auth onAuthSuccess={vi.fn()} />);
  const password = container.querySelector('input[type="password"]');

  await userEvent.click(screen.getByRole("button", { name: /show password/i }));

  expect(password).toHaveAttribute("type", "text");
  expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute("aria-pressed", "true");
});

test("requires a name when creating an account", async () => {
  const { container } = render(<Auth onAuthSuccess={vi.fn()} />);
  await userEvent.click(screen.getByRole("tab", { name: /create account/i }));
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "student@example.com" } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "Password123!" } });

  fireEvent.submit(container.querySelector("form"));

  expect(screen.getByText(/please enter your name/i)).toBeVisible();
  expect(api.post).not.toHaveBeenCalled();
});

test("shows an API error after a failed login", async () => {
  api.post.mockRejectedValueOnce(new Error("Invalid credentials"));
  const { container } = render(<Auth onAuthSuccess={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "student@example.com" } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "wrong-password" } });

  fireEvent.submit(container.querySelector("form"));

  expect(await screen.findByText("Invalid credentials")).toBeVisible();
  expect(api.post).toHaveBeenCalledWith("/api/auth/login", {
    email: "student@example.com",
    password: "wrong-password"
  });
});

test("completes a successful login", async () => {
  const onAuthSuccess = vi.fn();
  api.post.mockResolvedValueOnce({ data: { token: "token", user: { id: "user-1" } } });
  const { container } = render(<Auth onAuthSuccess={onAuthSuccess} />);
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "student@example.com" } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: "Password123!" } });

  fireEvent.submit(container.querySelector("form"));

  await waitFor(
    () => expect(onAuthSuccess).toHaveBeenCalledWith("token", { id: "user-1" }),
    { timeout: 2000 }
  );
  expect(screen.getByText(/login successful/i)).toBeVisible();
});
