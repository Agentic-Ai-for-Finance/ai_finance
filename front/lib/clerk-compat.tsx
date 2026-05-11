"use client";

import type { ReactNode } from "react";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}

export function useOptionalAuth() {
  if (!clerkEnabled) {
    return {
      isSignedIn: false,
      isLoaded: true,
      userId: null,
    };
  }

  // Clerk may be intentionally disabled in some environments; only call useAuth when enabled.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth();
}

export function OptionalSignInButton({
  children,
}: {
  children: ReactNode;
}) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return <SignInButton mode="modal">{children}</SignInButton>;
}

export function OptionalSignedIn({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return null;
  }

  return <SignedIn>{children}</SignedIn>;
}

export function OptionalSignedOut({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return <SignedOut>{children}</SignedOut>;
}

export function OptionalUserButton({ afterSignOutUrl }: { afterSignOutUrl: string }) {
  if (!clerkEnabled) {
    return null;
  }

  return <UserButton afterSignOutUrl={afterSignOutUrl} />;
}
