/**
 * Utilities for deterministic mapping between StudyConnect entities and Stream Chat IDs.
 *
 * Stream Chat requirements:
 * - User IDs and Channel IDs can only contain alphanumeric characters, underscores, and hyphens.
 * - Max length: 64 characters.
 */

export const STREAM_USER_ID_PREFIX = "studyconnect_";
export const STREAM_DM_PREFIX = "dm_";
export const STREAM_COMMUNITY_PREFIX = "comm_";

/**
 * Maps a StudyConnect user ID (e.g. MongoDB ObjectId) to a deterministic Stream user ID.
 */
export const toStreamUserId = (userId: string): string => {
  if (!userId) return "";
  const cleaned = String(userId).trim();
  if (cleaned.startsWith(STREAM_USER_ID_PREFIX)) {
    return cleaned;
  }
  return `${STREAM_USER_ID_PREFIX}${cleaned}`;
};

/**
 * Extracts the original StudyConnect user ID from a Stream user ID.
 */
export const fromStreamUserId = (streamUserId: string): string => {
  if (!streamUserId) return "";
  const cleaned = String(streamUserId).trim();
  if (cleaned.startsWith(STREAM_USER_ID_PREFIX)) {
    return cleaned.slice(STREAM_USER_ID_PREFIX.length);
  }
  return cleaned;
};

/**
 * Deterministically derives a Stream DM channel ID from two StudyConnect user IDs.
 * The two IDs are stripped of prefixes, sorted alphabetically, and concatenated.
 * Result format: `dm_<user1>_<user2>` (max 52 characters, well under 64 chars limit).
 */
export const toStreamDmChannelId = (userIdA: string, userIdB: string): string => {
  const cleanA = fromStreamUserId(userIdA);
  const cleanB = fromStreamUserId(userIdB);
  if (!cleanA || !cleanB) {
    throw new Error("Both user IDs are required to generate a DM channel ID");
  }
  const sorted = [cleanA, cleanB].sort();
  return `${STREAM_DM_PREFIX}${sorted[0]}_${sorted[1]}`;
};

/**
 * Parses the participant user IDs from a deterministic Stream DM channel ID.
 */
export const parseStreamDmChannelId = (channelId: string): [string, string] | null => {
  if (!channelId || !channelId.startsWith(STREAM_DM_PREFIX)) {
    return null;
  }
  const parts = channelId.slice(STREAM_DM_PREFIX.length).split("_");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return [parts[0], parts[1]];
};

/**
 * Deterministically derives a Stream Community channel ID from a community ID and channel key/slug.
 * Format: `comm_<communityId>_<channelKey>`
 * Guarantees length <= 64 characters and valid character set.
 */
export const toStreamCommunityChannelId = (communityId: string, channelKey: string): string => {
  const cleanCommId = fromStreamUserId(communityId);
  const cleanKey = String(channelKey)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 26); // 5 ("comm_") + 24 (communityId) + 1 ("_") + 26 = 56 characters <= 64
  return `${STREAM_COMMUNITY_PREFIX}${cleanCommId}_${cleanKey}`;
};

/**
 * Deterministically derives a Stream Channel ID for a Community Group.
 * Format: `comm_<communityId>_grp_<groupId>`
 * Length: 5 ("comm_") + 24 + 5 ("_grp_") + 24 = 58 characters <= 64
 */
export const toStreamGroupChannelId = (communityId: string, groupId: string): string => {
  const cleanCommId = fromStreamUserId(communityId);
  const cleanGroupId = fromStreamUserId(groupId);
  return `${STREAM_COMMUNITY_PREFIX}${cleanCommId}_grp_${cleanGroupId}`;
};

/**
 * Deterministically derives a Stream Channel ID for a Community's Announcement Space.
 * Format: `comm_<communityId>_announcements`
 * Length: 5 ("comm_") + 24 + 1 ("_") + 13 = 43 characters <= 64
 */
export const toStreamAnnouncementChannelId = (communityId: string): string => {
  const cleanCommId = fromStreamUserId(communityId);
  return `${STREAM_COMMUNITY_PREFIX}${cleanCommId}_announcements`;
};
