import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { getAuth } from "./server";
import { authClient } from "./client";

it("creates a real account session, signs back in, and rejects wrong credentials and cross-site signup", async () => {
  const auth = getAuth();
  const origin = "http://localhost:8080";
  const email = `${randomUUID()}@example.invalid`;
  const password = "synthetic-password-2026";
  const request = (path: string, body: unknown, requestOrigin = origin) =>
    auth.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: requestOrigin },
        body: JSON.stringify(body),
      }),
    );
  const signup = await request("sign-up/email", { name: "Synthetic Signup", email, password });
  expect(signup.status).toBe(200);
  const cookieHeaders = (response: Response) =>
    new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; "),
    });
  const first = await auth.api.getSession({ headers: cookieHeaders(signup) });
  expect(first?.user.email).toBe(email);
  expect(first?.user.emailVerified).toBe(false);
  const signin = await request("sign-in/email", { email, password });
  expect(signin.status).toBe(200);
  const second = await auth.api.getSession({ headers: cookieHeaders(signin) });
  expect(second?.user.id).toBe(first?.user.id);
  const wrongPassword = await request("sign-in/email", {
    email,
    password: "synthetic-wrong-password",
  });
  expect(wrongPassword.status).toBe(401);
  expect(wrongPassword.headers.getSetCookie()).toEqual([]);
  // Better Auth defaults to skipping origin checks under NODE_ENV=test. Use
  // its production check for this assertion, then restore the test context.
  const context = await auth.$context;
  const skipped = context.skipOriginCheck;
  context.skipOriginCheck = false;
  try {
    const crossSite = await request(
      "sign-up/email",
      {
        name: "Must Refuse",
        email: `${randomUUID()}@example.invalid`,
        password,
      },
      "https://example.invalid",
    );
    expect(crossSite.status).toBe(403);
  } finally {
    context.skipOriginCheck = skipped;
  }
});

it("uses the application client's email API against the real handler and resolves its session", async () => {
  const auth = getAuth();
  const origin = "http://localhost:8080";
  let cookie = "";
  // In-process transport only. Browser cookie acceptance and same-origin
  // routing are separate acceptance checks owned by the parent runner.
  const customFetchImpl: typeof fetch = async (input, init) => {
    expect(init?.credentials).toBe("include");
    const request = new Request(typeof input === "string" ? new URL(input, origin) : input, init);
    const headers = new Headers(request.headers);
    headers.set("origin", origin);
    if (cookie) headers.set("cookie", cookie);
    const response = await auth.handler(
      new Request(`${origin}${new URL(request.url).pathname}`, {
        method: request.method,
        headers,
        ...(request.method === "GET" ? {} : { body: await request.text() }),
      }),
    );
    const cookies = response.headers.getSetCookie();
    if (cookies.length) cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    return response;
  };
  const email = `${randomUUID()}@example.invalid`;
  const password = "synthetic-client-password-2026";
  const signup = await authClient.signUp.email(
    { email, password, name: "Synthetic Client" },
    { customFetchImpl },
  );
  expect(signup.error).toBeNull();
  expect(signup.data?.user.email).toBe(email);
  const session = await authClient.getSession({ fetchOptions: { customFetchImpl } });
  expect(session.error).toBeNull();
  expect(session.data?.user.id).toBe(signup.data?.user.id);
  cookie = "";
  const signin = await authClient.signIn.email({ email, password }, { customFetchImpl });
  expect(signin.error).toBeNull();
  expect(signin.data?.user.id).toBe(signup.data?.user.id);
});
