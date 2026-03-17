import BuildInAgentBadgeZhCN from './build-in-agent.svg';
import BuildInAgentBadgeZhTW from './build-in-agent-tw.svg';
import BuildInAgentBadgeEnUS from './build-in-agent-us.svg';
import SystemAgentBadge from './system-agent.svg';

export const BUILT_IN_AGENT_BADGE_ICONS: Record<'zh-CN' | 'zh-TW' | 'en-US', string> = {
  'zh-CN': BuildInAgentBadgeZhCN,
  'zh-TW': BuildInAgentBadgeZhTW,
  'en-US': BuildInAgentBadgeEnUS,
};

export const SYSTEM_AGENT_BADGE_ICON = SystemAgentBadge;
