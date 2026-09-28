import { useSession, signIn, signUp, signOut } from "../lib/auth-client";

// Usage in an .astro page:
//   import AuthStatus from "../components/AuthStatus";
//   <AuthStatus client:load />
export default function AuthStatus() {
  const { data: session, isPending } = useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <div>
        {/* One-time: creates the test account. Remove this button once
            you've run it successfully — it'll 422/error on repeat clicks
            since the account already exists by then. */}
        <button
          onClick={() =>
            signUp.email({
              email: "test@example.com",
              password: "changeme",
              name: "Test",
            })
          }
        >
          Sign up (test account)
        </button>
        <button
          onClick={() =>
            signIn.email({ email: "test@example.com", password: "changeme" })
          }
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <span>Signed in as {session.user.name}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}