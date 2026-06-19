/* ─────────── Per-token HP via document flags ─────────── */

function _getTokenHp(token) {
  const flag = token.document.getFlag('tiny6dbar', 'hp');
  return flag !== undefined ? Number(flag) : null;
}

function _seedTokenHp(token) {
  const w = token.actor?.system?.wounds;
  if (!w) return null;
  const remaining = (w.max ?? 0) - (w.value ?? 0);
  token.document.setFlag('tiny6dbar', 'hp', remaining).catch(() => {});
  return remaining;
}

function _readHp(token) {
  const w = token.actor?.system?.wounds;
  const max = w?.max ?? 0;
  let hp = _getTokenHp(token);
  if (hp === null) hp = _seedTokenHp(token);
  if (hp === null) return null;
  return Math.max(0, Math.min(max, hp));
}

function _setTokenHp(token, val) {
  const w = token.actor?.system?.wounds;
  const max = w?.max ?? 0;
  const clamped = Math.max(0, Math.min(max, val));
  token.document.setFlag('tiny6dbar', 'hp', clamped);
}

function _getArmorTotal(actor) {
  let total = 0;
  for (const item of actor.items) {
    if (item.type === 'armor' && item.system.equipped) {
      total += Number(item.system.damageReduction || 0);
    }
  }
  return total;
}

/* ─────────── Hook init ─────────── */

export function initTokenBars() {
  Hooks.on('renderTokenHUD', (hud, html, data) => {
    const token = hud.object;
    const actor = token?.actor;
    if (!actor?.system?.wounds) return;

    const hp = _readHp(token);
    if (hp === null) return;

    const max = actor.system.wounds.max ?? 0;
    const armorTotal = _getArmorTotal(actor);

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
    if (leftCol) leftCol.appendChild(section);

    section.querySelector('[data-action="hp-damage"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = _readHp(token);
      if (cur !== null && cur > 0) {
        _setTokenHp(token, cur - 1);
        hud.render();
      }
    });

    section.querySelector('[data-action="hp-heal"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = _readHp(token);
      if (cur !== null && cur < max) {
        _setTokenHp(token, cur + 1);
        hud.render();
      }
    });
  });
}
