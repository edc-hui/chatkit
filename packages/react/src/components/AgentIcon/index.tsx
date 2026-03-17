import React, { useMemo } from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { AGENT_ICON_ASSETS } from '@kweaver-ai/chatkit-shared';
import SystemAgentAvatarWrapper from './SystemAgentAvatarWrapper';
import BuildInAgentAvatarWrapper from './BuildInAgentAvatarWrapper';
import { resolveCurrentAgentAvatar } from './agentIconState.js';

export const AVATAR_OPTIONS = Object.keys(AGENT_ICON_ASSETS).map(key => ({
  type: 1,
  value: key,
  img: AGENT_ICON_ASSETS[key],
}));

export interface AgentIconProps {
  size?: number;
  avatarType: number | string;
  avatar: string;
  name: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  showSystemLogo?: boolean;
  showBuildInLogo?: boolean;
}

const AgentIcon: React.FC<AgentIconProps> = ({
  size = 80,
  avatarType,
  avatar,
  name,
  onClick,
  style,
  showSystemLogo = false,
  showBuildInLogo = false,
}) => {
  const currentAvatar = useMemo(
    () => resolveCurrentAgentAvatar(AVATAR_OPTIONS, avatarType, avatar),
    [avatarType, avatar]
  );

  const buildInAgentIconSize = size / 2 - 2;
  const systemAgentIconSize = size / 2 - 6;

  const agentAvatar = (
    <Avatar
      shape="square"
      size={size}
      style={{
        cursor: onClick ? 'pointer' : 'auto',
        ...style,
      }}
      src={currentAvatar?.img}
      onClick={onClick}
      icon={!currentAvatar?.img && !name ? <UserOutlined /> : undefined}
    >
      {!currentAvatar?.img && name ? name.charAt(0).toUpperCase() : null}
    </Avatar>
  );

  if (showBuildInLogo && showSystemLogo) {
    return (
      <SystemAgentAvatarWrapper systemAgentIconSize={systemAgentIconSize} size={size}>
        <BuildInAgentAvatarWrapper buildInAgentIconSize={buildInAgentIconSize} size={size}>
          {agentAvatar}
        </BuildInAgentAvatarWrapper>
      </SystemAgentAvatarWrapper>
    );
  }

  if (showBuildInLogo) {
    return (
      <BuildInAgentAvatarWrapper buildInAgentIconSize={buildInAgentIconSize} size={size}>
        {agentAvatar}
      </BuildInAgentAvatarWrapper>
    );
  }

  if (showSystemLogo) {
    return (
      <SystemAgentAvatarWrapper systemAgentIconSize={systemAgentIconSize} size={size}>
        {agentAvatar}
      </SystemAgentAvatarWrapper>
    );
  }

  return agentAvatar;
};

export default AgentIcon;
