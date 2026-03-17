import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';

import { createDipProvider } from '@kweaver-ai/chatkit-provider-dip';
import { Assistant, ChatKitProvider } from '@kweaver-ai/chatkit-react';

import styles from './App.module.css';

const DIP_ACCESS_TOKEN = 'ory_at_Ove3aBd-PJCbZ7vizuhErqryMfA7lCW-AUHFyTbDKB8.xmPIQIRDCE0Ak1ulnMBBQFCRInLR3JXVgVh-umKW9R0';

const provider = createDipProvider({
  // agentKey: '01KG46K6TT9YBNZ4K7N654GGN9',
  agentKey: '01KKXAXPKNH249S83T5CCHJ7AC',
  getAccessToken: async () => DIP_ACCESS_TOKEN,
});

function App() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>ChatKit React Demo</h1>
          <p className={styles.desc}>当前示例通过 Vite 本地代理调用 DIP 流式接口，token 由 getAccessToken 返回。</p>
        </header>
        <ChatKitProvider provider={provider} providerName="dip" locale="zh-CN">
          <Assistant
            title="爱数 Chat"
            allowAttachments
            allowDeepThink
            allowFeedback
            showConversations
            showOnboarding
            showContextPanel
            showFilesPanel
            showWorkbench
          />
        </ChatKitProvider>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
