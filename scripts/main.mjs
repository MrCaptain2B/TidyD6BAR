import { initTokenBars } from './canvas/TokenWounds.mjs';
import { HeroSheet } from './sheets/HeroSheet.mjs';
import { NpcSheet } from './sheets/NpcSheet.mjs';

Hooks.once('init', () => {
  console.log('[Tiny6dBar] init');
  registerHelpers();

  ActorSheet.registerSheet('tinyd6', HeroSheet, {
    types: ['hero'],
    makeDefault: true,
    label: 'TINY6DBAR.SheetHero'
  });

  ActorSheet.registerSheet('tinyd6', NpcSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'TINY6DBAR.SheetNpc'
  });

});

Hooks.once('ready', () => {
  console.log('[Tiny6dBar] ready');
  initTokenBars();
});

function registerHelpers() {
  Handlebars.registerHelper('times', function (n, block) {
    let acc = '';
    for (let i = 0; i < n; i++) acc += block.fn(i);
    return acc;
  });

  Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
  });

  Handlebars.registerHelper('is', function (a, b) {
    return a === b;
  });
}
