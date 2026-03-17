import React from 'react';

import { Button, Card } from 'antd';

import { useChatKitI18n } from '../ChatKitProvider.js';
import { Assistant, type AssistantProps } from '../Assistant/index.js';
import type { ChatKitRef } from '../imperative.js';
import styles from './Copilot.module.css';

export interface CopilotProps extends AssistantProps {
  width?: number | string;
  onClose?: () => void;
}

export const Copilot = React.forwardRef<ChatKitRef, CopilotProps>(function Copilot(props, ref) {
  const { t } = useChatKitI18n();

  return (
    <Card className={styles.panel} style={{ width: props.width ?? 420 }} bodyStyle={{ padding: 0 }}>
      {props.onClose ? (
        <div className={styles.closeRow}>
          <Button type="text" onClick={props.onClose}>
            {t('copilot.close')}
          </Button>
        </div>
      ) : null}
      <Assistant
        ref={ref}
        {...props}
        title={props.title ?? t('copilot.title')}
        showConversations={props.showConversations ?? false}
        showContextPanel={props.showContextPanel ?? false}
        showFilesPanel={props.showFilesPanel ?? false}
      />
    </Card>
  );
});

Copilot.displayName = 'Copilot';
