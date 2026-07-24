import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/react';
import { toast } from 'sonner';

export function AuthStatusToast() {
    const { isSignedIn, isLoaded } = useUser();
    const previousSignInState = useRef<boolean | null>(null);

    useEffect(() => {
        if (!isLoaded) return;

        // Check if state changed
        if (previousSignInState.current !== null) {
            if (isSignedIn && !previousSignInState.current) {
                // User just signed in
                toast.success('✅ Logged in successfully! Welcome back.');
            } else if (!isSignedIn && previousSignInState.current) {
                // User just signed out
                toast.info('👋 You have been signed out.');
            }
        }

        previousSignInState.current = isSignedIn;
    }, [isSignedIn, isLoaded]);

    return null;
}