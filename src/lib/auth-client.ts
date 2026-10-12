import { createAuthClient } from "better-auth/react";

// No baseURL on purpose: the client talks to /api/auth on whatever origin the
// page is served from, so the same build works on localhost, previews and prod.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
