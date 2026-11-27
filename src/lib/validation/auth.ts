/** Client-side sign-up validation. The server (Better Auth) re-validates everything. */
export type SignUpErrors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms" | "form", string>>;

export function validateSignUp(input: { name: string; email: string; password: string; confirm: string; terms: boolean }): SignUpErrors {
  const errors: SignUpErrors = {};
  if (input.name.trim().length < 2) errors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "Enter a valid email address.";
  if (input.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (input.password.length > 128) errors.password = "Use at most 128 characters.";
  if (input.confirm !== input.password) errors.confirm = "Passwords don't match.";
  if (!input.terms) errors.terms = "You need to accept the terms to continue.";
  return errors;
}
