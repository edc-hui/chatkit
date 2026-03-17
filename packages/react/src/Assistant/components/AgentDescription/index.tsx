import React from 'react';
import { Flex } from 'antd';
import classNames from 'classnames';
import { XMarkdown } from '@ant-design/x-markdown';
import AgentIcon from '../../../components/AgentIcon';
import styles from './AgentDescription.module.css';

export interface AgentDescriptionProps {
  name?: string;
  avatar?: string;
  avatarType?: number | string;
  description?: string;
  prompts?: Array<{ id: string; label: string }>;
  onPromptClick?: (question: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const AgentDescription: React.FC<AgentDescriptionProps> = ({
  name = '',
  avatar = '',
  avatarType = 1,
  description,
  prompts,
  onPromptClick,
  className,
  style,
}) => {
  return (
    <div className={classNames(styles.container, className)} style={style}>
      <AgentIcon
        avatarType={avatarType}
        avatar={avatar}
        size={90}
        name={name}
      />
      <div className={classNames(styles.name, 'dip-mt-16')}>
        {name}
      </div>
      
      {description && (
        <div className={styles.description}>
          <XMarkdown content={description} />
        </div>
      )}

      {prompts && prompts.length > 0 && (
        <div className={styles.questionList}>
          <div className={styles.questionLabel}>你可以问我：</div>
          {prompts.map((item) => (
            <div
              key={item.id}
              className={styles.questionItem}
              onClick={() => onPromptClick?.(item.label)}
            >
              <div title={item.label} className="dip-ellipsis">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentDescription;
