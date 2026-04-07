import { readLobster, writeLobster, appendLog } from '../lib/memory.js';
import { t } from '../lib/i18n.js';

export async function rest(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) {
    console.log('\n' + t('no_lobster'));
    return;
  }

  if (lobster.status === 'hibernating') {
    console.log('\n' + t('rest_already', { name: lobster.name }));
    return;
  }

  if (lobster.status === 'molting') {
    console.log('\n' + t('rest_molting', { name: lobster.name }));
    return;
  }

  lobster.status = 'hibernating';
  lobster.hibernated_at = new Date().toISOString();
  const hadDepth = lobster.depth && lobster.depth > 0;
  if (hadDepth) lobster.depth = 0;

  await writeLobster(lobster);
  await appendLog(`💤 ${lobster.name} → hibernation`);

  console.log('\n' + '─'.repeat(40));
  console.log(t('rest_desc1', { name: lobster.name }));
  console.log(t('rest_desc2'));
  console.log(t('rest_desc3'));
  console.log(t('rest_desc4'));
  if (hadDepth) console.log(t('depth_reset'));
  console.log('─'.repeat(40));
  console.log('\n' + t('rest_wake_hint'));
}
