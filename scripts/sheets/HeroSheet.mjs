export class HeroSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'modules/tiny6dbar/templates/hero-sheet.hbs',
      classes: ['tinyd6', 'sheet', 'actor', 'hero'],
      width: 620,
      height: 800,
      tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'main' }]
    });
  }

  getData() {
    const data = super.getData();
    data.system.woundBoxes = this._getWoundBoxes();
    data.system.armorTotal = this._getArmorTotal();
    data.system.armorItems = this.actor.items.filter(i => i.type === 'armor');
    data.system.weaponItems = this.actor.items.filter(i => i.type === 'weapon');
    data.system.gearItems = this.actor.items.filter(i => i.type === 'gear');
    data.system.traitItems = this.actor.items.filter(i => i.type === 'trait');
    data.system.heritage = this.actor.items.find(i => i.type === 'heritage');
    return data;
  }

  _getWoundBoxes() {
    const w = this.actor.system.wounds || {};
    const value = w.value ?? 0;
    const max = w.max ?? 6;
    return Array.from({ length: max }, (_, i) => ({
      index: i,
      checked: i < value
    }));
  }

  _getArmorTotal() {
    let total = 0;
    for (const item of this.actor.items) {
      if (item.type === 'armor' && item.system.equipped) {
        total += Number(item.system.damageReduction || 0);
      }
    }
    return total;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.wound-box').on('click', this._onWoundToggle.bind(this));
    html.find('.item-equip').on('click', this._onEquipToggle.bind(this));
    html.find('.item-open').on('click', this._onItemOpen.bind(this));
  }

  _onItemOpen(event) {
    const id = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) item.sheet.render(true);
  }

  _onWoundToggle(event) {
    const index = Number(event.currentTarget.dataset.index);
    const current = this.actor.system.wounds?.value ?? 0;
    if (index < current) {
      this.actor.update({ 'system.wounds.value': index });
    } else {
      this.actor.update({ 'system.wounds.value': index + 1 });
    }
  }

  _onEquipToggle(event) {
    const id = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) item.update({ 'system.equipped': !item.system.equipped });
  }
}
