import { readLobster } from '../lib/memory.js';
import { ACHIEVEMENTS } from '../lib/achievements.js';
import { t } from '../lib/i18n.js';

export async function achievements(): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) { console.log('\n' + t('no_lobster')); return; }

  const unlocked = new Set(lobster.achievements ?? []);
  const total = Object.keys(ACHIEVEMENTS).length;

  console.log('\n' + t('achieve_title', { count: unlocked.size, total }));
  console.log('─'.repeat(40));

  for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
    if (unlocked.has(id)) {
      console.log(t('achieve_item', { name: def.name, desc: def.desc }));
    } else {
      console.log(t('achieve_locked', { name: def.name, desc: def.desc }));
    }
  }
  console.log('─'.repeat(40));
}
