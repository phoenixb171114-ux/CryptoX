/**
 * Password strength policy. Kept free of server-only imports so the sign-up
 * form can check it in the browser before moving to the next step; the server
 * re-checks it on submit.
 */
export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 10) issues.push("Password must be at least 10 characters.");
  if (!/[a-z]/.test(pw)) issues.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(pw)) issues.push("Add an uppercase letter.");
  if (!/[0-9]/.test(pw)) issues.push("Add a number.");
  return issues;
}
