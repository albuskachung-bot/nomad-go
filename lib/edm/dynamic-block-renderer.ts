import type { EdmDynamicBlock, Profile } from "@/lib/types";

const blockTokenPattern = /\{\{\s*block_([a-z0-9_-]+)\s*\}\}/gi;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function profileRoleTokens(profile: Partial<Profile>) {
  const sourceValues = [
    profile.title,
    profile.job_title,
    ...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(profile.work_type) ? profile.work_type : [])
  ];

  return sourceValues
    .flatMap((value) => (value ?? "").split(/[\s,，、/|]+/))
    .map(slugify)
    .filter(Boolean);
}

function profileMatchesTargetRole(profile: Partial<Profile>, targetRole: string) {
  const normalizedTargetRole = slugify(targetRole);

  if (!normalizedTargetRole) {
    return false;
  }

  return profileRoleTokens(profile).some(
    (token) =>
      token === normalizedTargetRole ||
      token.includes(normalizedTargetRole) ||
      normalizedTargetRole.includes(token)
  );
}

export function renderEdmDynamicBlocks(
  html: string,
  profile: Partial<Profile>,
  blocks: EdmDynamicBlock[]
) {
  if (!html || blocks.length === 0) {
    return html;
  }

  const blockByToken = new Map<string, EdmDynamicBlock>();

  blocks.forEach((block) => {
    blockByToken.set(slugify(block.name), block);
    blockByToken.set(slugify(block.target_role), block);
  });

  return html.replace(blockTokenPattern, (_match, token: string) => {
    const block = blockByToken.get(slugify(token));

    if (!block || !profileMatchesTargetRole(profile, block.target_role)) {
      return "";
    }

    return block.html_content;
  });
}
