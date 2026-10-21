import React from 'react';

export default function Toast({ notification, onDismiss }) {
  return <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
    {notification && <div className={`toast toast--${notification.kind}`} key={notification.id}>
      <span>{notification.message}</span><button onClick={onDismiss} aria-label="알림 닫기">×</button>
    </div>}
  </div>;
}
