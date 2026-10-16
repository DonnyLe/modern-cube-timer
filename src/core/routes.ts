import { generatePath } from 'react-router';

export function sessionPath(id: string, tab = 'overview') {
  return generatePath('/session/:sessionId/:tab', { sessionId: id, tab });
}
