import { UserProfile } from "@clerk/react";

export default function UserProfilePage() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <UserProfile />
        </div>
    );
}