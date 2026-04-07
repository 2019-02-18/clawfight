import { readLobster, writeLobster } from '../lib/memory.js';
import { formatEquip } from '../lib/equipment.js';
import { SLOT_ICONS, SLOT_LABELS, MAX_INVENTORY } from '../lib/types.js';
import type { EquipSlot } from '../lib/types.js';
import { t } from '../lib/i18n.js';

const SLOTS: EquipSlot[] = ['claw', 'shell', 'charm'];

export async function equip(action?: string, arg?: string): Promise<void> {
  const lobster = await readLobster();
  if (!lobster) { console.log('\n' + t('no_lobster')); return; }

  if (!lobster.equipped) lobster.equipped = {};
  if (!lobster.inventory) lobster.inventory = [];

  if (!action) {
    console.log('\n' + t('equip_title'));
    console.log('─'.repeat(40));
    for (const s of SLOTS) {
      const eq = lobster.equipped[s];
      if (eq) {
        console.log(t('equip_slot_item', { icon: SLOT_ICONS[s], slot: SLOT_LABELS[s], item: formatEquip(eq) }));
      } else {
        console.log(t('equip_slot_empty', { icon: SLOT_ICONS[s], slot: SLOT_LABELS[s] }));
      }
    }
    console.log();
    console.log(t('equip_inv_title', { count: lobster.inventory.length, max: MAX_INVENTORY }));
    if (lobster.inventory.length === 0) {
      console.log(t('equip_inv_empty'));
    } else {
      for (let i = 0; i < lobster.inventory.length; i++) {
        console.log(t('equip_inv_item', { index: i + 1, item: formatEquip(lobster.inventory[i]) }));
      }
    }
    console.log('─'.repeat(40));
    console.log(t('equip_usage'));
    return;
  }

  if (action === 'drop') {
    const idx = parseInt(arg || '', 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= lobster.inventory.length) {
      console.log('\n' + t('equip_bad_index'));
      return;
    }
    const removed = lobster.inventory.splice(idx, 1)[0];
    await writeLobster(lobster);
    console.log('\n' + t('equip_dropped', { item: formatEquip(removed) }));
    return;
  }

  if (action === 'unequip') {
    const slot = arg as EquipSlot;
    if (!slot || !SLOTS.includes(slot)) {
      console.log('\n' + t('equip_bad_index'));
      return;
    }
    const eq = lobster.equipped[slot];
    if (!eq) {
      console.log('\n' + t('equip_slot_empty', { icon: SLOT_ICONS[slot], slot: SLOT_LABELS[slot] }));
      return;
    }
    if (lobster.inventory.length >= MAX_INVENTORY) {
      console.log('\n' + t('equip_inv_full', { max: MAX_INVENTORY, item: eq.name }));
      return;
    }
    lobster.inventory.push(eq);
    delete lobster.equipped[slot];
    await writeLobster(lobster);
    console.log('\n' + t('equip_unequipped', { item: formatEquip(eq) }));
    return;
  }

  const idx = parseInt(action, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= lobster.inventory.length) {
    console.log('\n' + t('equip_bad_index'));
    return;
  }

  const item = lobster.inventory[idx];
  const existing = lobster.equipped[item.slot];

  lobster.inventory.splice(idx, 1);
  lobster.equipped[item.slot] = item;

  if (existing) {
    lobster.inventory.push(existing);
    await writeLobster(lobster);
    console.log('\n' + t('equip_swapped', { old: existing.name, item: formatEquip(item) }));
  } else {
    await writeLobster(lobster);
    console.log('\n' + t('equip_equipped', { item: formatEquip(item), slot: SLOT_LABELS[item.slot] }));
  }
}
