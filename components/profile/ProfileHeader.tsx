import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface ProfileHeaderProps {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  postCount: number;
  followerCount?: number;
  followingCount?: number;
  isOwnProfile: boolean;
}

/**
 * Profile header with banner, avatar, display info, and edit button.
 * Matches the Threadify profile design — banner image with overlapping circular avatar.
 */
export function ProfileHeader({
  username,
  displayName,
  bio,
  avatarUrl,
  bannerUrl,
  postCount,
  followerCount = 0,
  followingCount = 0,
  isOwnProfile,
}: ProfileHeaderProps) {
  return (
    <header className="relative">
      {/* Banner */}
      <div className="h-48 w-full overflow-hidden bg-surface-container-high">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={`Banner ${displayName}`}
            width={600}
            height={192}
            className="h-full w-full object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/10 to-surface-container-high" />
        )}
      </div>

      {/* Profile Info Section */}
      <div className="px-md pb-md">
        {/* Avatar + Edit Button Row */}
        <div className="-mt-16 mb-md flex items-end justify-between">
          <div className="rounded-full bg-surface p-1">
            <Avatar
              src={avatarUrl}
              displayName={displayName}
              size="lg"
              className="h-32 w-32 border-4 border-surface"
            />
          </div>

          {isOwnProfile && (
            <Link
              href={`/profile/${username}/edit`}
              className="mb-2 rounded-full border border-outline px-md py-xs text-label-md font-bold transition-colors hover:bg-surface-container-low"
            >
              Edit Profil
            </Link>
          )}
        </div>

        {/* Name & Bio */}
        <div className="space-y-xs">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface">
              {displayName}
            </h2>
            <p className="text-body-lg text-on-surface-variant">@{username}</p>
          </div>

          {bio && (
            <p className="py-xs text-body-lg text-on-surface">{bio}</p>
          )}

          {/* Stats */}
          <div className="flex gap-md text-body-sm">
            <span className="text-on-surface-variant">
              <strong className="text-on-surface">{followingCount}</strong>{" "}
              Mengikuti
            </span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface">{followerCount}</strong>{" "}
              Pengikut
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
