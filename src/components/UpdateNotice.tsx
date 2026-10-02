import { useRegisterSW } from 'virtual:pwa-register/react';
export function UpdateNotice({ busy }: { busy: boolean }) {
  const {
    needRefresh: [needed],
    updateServiceWorker,
  } = useRegisterSW();
  return needed && !busy ? (
    <div className="toast" role="status">
      An update is ready.<button onClick={() => void updateServiceWorker(true)}>Update now</button>
    </div>
  ) : null;
}
