export interface AgentAvatarOption {
  type: number;
  value: string;
  img: string;
}

function normalizeLocale(locale: string | undefined): string {
  return (locale ?? '').trim().toLowerCase();
}

export function resolveBuiltInBadgeIcon(
  locale: string | undefined,
  icons: Record<'zh-CN' | 'zh-TW' | 'en-US', string>
): string {
  const normalizedLocale = normalizeLocale(locale);

  if (normalizedLocale === 'en-us') {
    return icons['en-US'];
  }

  if (normalizedLocale === 'zh-tw') {
    return icons['zh-TW'];
  }

  return icons['zh-CN'];
}

export function resolveCurrentAgentAvatar(
  options: AgentAvatarOption[],
  avatarType: number | string,
  avatar: string
): AgentAvatarOption | undefined {
  const normalizedType = Number(avatarType);
  const normalizedAvatar = String(avatar);

  return (
    options.find(option => option.type === normalizedType && option.value === normalizedAvatar) ??
    options[0]
  );
}
