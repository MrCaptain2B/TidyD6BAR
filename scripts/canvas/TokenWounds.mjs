const PREFIX = '[Tiny6dBar]';

function _log(...args) { console.log(PREFIX, ...args); }
function _warn(...args) { console.warn(PREFIX, ...args); }
function _err(...args) { console.error(PREFIX, ...args); }

function _getTokenHp(token) {
  const flag = token.document.getFlag('tiny6dbar', 'hp');
  _log('_getTokenHp flag:', flag);
  return flag !== undefined ? Number(flag) : null;
}

function _seedTokenHp(token) {
  const w = token.actor?.system?.wounds;
  if (!w) {
    _warn('_seedTokenHp: no wounds on actor');
    return null;
  }
  const remaining = (w.max ?? 0) - (w.value ?? 0);
  _log('_seedTokenHp: remaining=', remaining, 'from wounds max=', w.max, 'value=', w.value);
  token.document.setFlag('tiny6dbar', 'hp', remaining).catch(() => {});
  return remaining;
}

function _readHp(token) {
  const w = token.actor?.system?.wounds;
  const max = w?.max ?? 0;
  let hp = _getTokenHp(token);
  if (hp === null) {
    _log('_readHp: no flag, seeding');
    hp = _seedTokenHp(token);
  }
  if (hp === null) return null;
  const clamped = Math.max(0, Math.min(max, hp));
  if (clamped !== hp) _log('_readHp: clamped from', hp, 'to', clamped);
  return clamped;
}

function _setTokenHp(token, val) {
  const w = token.actor?.system?.wounds;
  const max = w?.max ?? 0;
  const clamped = Math.max(0, Math.min(max, val));
  _log('_setTokenHp: val=', val, 'clamped=', clamped, 'max=', max);
  token.document.setFlag('tiny6dbar', 'hp', clamped);
}

function _getArmorTotal(actor) {
  let total = 0;
  for (const item of actor.items) {
    if (item.type === 'armor' && item.system.equipped) {
      total += Number(item.system.damageReduction || 0);
    }
  }
  _log('_getArmorTotal:', total);
  return total;
}

export function initTokenBars() {
  _log('initTokenBars called, registering renderTokenHUD hook');

  Hooks.on('renderTokenHUD', (hud, html, data) => {
    const token = hud.object;
    const actor = token?.actor;

    _log('=== renderTokenHUD ===');
    _log('token:', token?.name, '(id:', token?.id, ')');
    _log('actor:', actor?.name, '(id:', actor?.id, ')');
    _log('token.document:', token?.document?.name);

    if (!actor?.system?.wounds) {
      _warn('actor has no system.wounds, skipping');
      return;
    }

    _log('wounds data:', JSON.stringify(actor.system.wounds));

    const hp = _readHp(token);
    _log('hp read result:', hp);
    if (hp === null) {
      _err('hp is null after read/seed, skipping');
      return;
    }

    const max = actor.system.wounds.max ?? 0;
    const armorTotal = _getArmorTotal(actor);
    _log('max:', max, 'armorTotal:', armorTotal);

    const section = document.createElement('div');
    section.className = 'tiny6dbar-hud';
    section.innerHTML = `
      <div class="tiny6dbar-hp">
        <button class="tiny6dbar-btn" data-action="hp-damage">\u2212</button>
        <span class="tiny6dbar-hp-value" style="color:${hp > 0 ? '#4d4' : '#d44'}">${hp}</span>
        <button class="tiny6dbar-btn" data-action="hp-heal">+</button>
      </div>
      ${armorTotal > 0 ? `<div class="tiny6dbar-armor">\u{1F6E1} ${armorTotal}</div>` : ''}
    `;

    const leftCol = html[0].querySelector('.col.left');
    _log('leftCol element found:', !!leftCol);
    if (leftCol) {
      leftCol.appendChild(section);
      _log('section appended to .col.left');
    } else {
      _warn('no .col.left found, HUD html structure:', html[0].innerHTML.slice(0, 500));
      html[0].appendChild(section);
      _log('section appended to HUD root');
    }

    section.querySelector('[data-action="hp-damage"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = _readHp(token);
      _log('damage button clicked, cur HP:', cur);
      if (cur !== null && cur > 0) {
        _setTokenHp(token, cur - 1);
        _log('damage applied, re-rendering HUD');
        hud.render();
      } else {
        _log('damage blocked: cur=', cur);
      }
    });

    section.querySelector('[data-action="hp-heal"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = _readHp(token);
      _log('heal button clicked, cur HP:', cur, 'max:', max);
      if (cur !== null && cur < max) {
        _setTokenHp(token, cur + 1);
        _log('heal applied, re-rendering HUD');
        hud.render();
      } else {
        _log('heal blocked: cur=', cur, 'max=', max);
      }
    });
  });
}
