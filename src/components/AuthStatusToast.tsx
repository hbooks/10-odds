import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function AuthStatusToast() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const status = searchParams.get('__clerk_status');
        const error = searchParams.get('error') || searchParams.get('__clerk_error');
        const message = searchParams.get('message');

        if (status === 'complete' || status === 'signed_in') {
            toast.success('Logged in successfully! Welcome back.');
            // Clean the URL to prevent showing again on refresh
            cleanUrl();
        } else if (status === 'signed_up') {
            toast.success('Account created successfully! Welcome!');
            cleanUrl();
        } else if (status === 'failed' || status === 'error') {
            toast.error(error || message || 'Authentication failed. Please try again.');
            cleanUrl();
        } else if (status === 'sign_out') {
            toast.info('You have been signed out.');
            cleanUrl();
        }
    }, [searchParams]);

    const cleanUrl = () => {
        // Remove Clerk's query params without refreshing the page
        const url = new URL(window.location.href);
        url.searchParams.delete('__clerk_status');
        url.searchParams.delete('error');
        url.searchParams.delete('__clerk_error');
        url.searchParams.delete('message');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    };

    return null;
}