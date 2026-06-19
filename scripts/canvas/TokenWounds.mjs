let _pixiV8 = null;

function _isV8() {
  if (_pixiV8 === null) {
    _pixiV8 = typeof PIXI.Graphics.prototype.fill === 'function';
  }
  return _pixiV8;
}

function _drawFilledRect(g, x, y, w, h, color) {
  if (_isV8()) {
    g.rect(x, y, w, h).fill({ color });
  } else {
    g.beginFill(color);
    g.drawRect(x, y, w, h);
    g.endFill();
  }
}

function _drawStrokedRect(g, x, y, w, h, color, width) {
  if (_isV8()) {
    g.rect(x, y, w, h).stroke({ width: width ?? 1, color });
  } else {
    g.lineStyle(width ?? 1, color);
    g.drawRect(x, y, w, h);
  }
}

function _makeText(content, style) {
  try {
    return new PIXI.Text({ text: content, style });
  } catch (e) {
    try {
      return new PIXI.Text(content, style);
    } catch (e2) {
      return null;
    }
  }
}

function _makeBtn(text, onClick) {
  const btn = _makeText(text, {
    fill: 0xffffff,
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    stroke: 0x000000,
    strokeThickness: 1
  });
  if (!btn) return null;
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

/* ─────────── Per-token HP via document flags ─────────── */

function _getTokenHp(token) {
  const flag = token.document.getFlag('tiny6dbar', 'hp');
  if (flag !== undefined) return Number(flag);
  return null;
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
  removeBars(token);
  drawHpBar(token);
  drawArmor(token);
}

/* ─────────── Hook init ─────────── */

export function initTokenBars() {
  Hooks.on('drawToken', (token) => {
    if (!token.actor?.system?.wounds) return;
    removeBars(token);
    drawHpBar(token);
    drawArmor(token);
  });

  Hooks.on('refreshToken', (token) => {
    if (!token.actor?.system?.wounds) return;
    removeBars(token);
    drawHpBar(token);
    drawArmor(token);
  });

  Hooks.on('createItem', (item) => {
    if (item.type !== 'armor') return;
    refreshAllTokens(item.parent);
  });

  Hooks.on('updateItem', (item) => {
    if (item.type !== 'armor') return;
    refreshAllTokens(item.parent);
  });

  Hooks.on('deleteItem', (item) => {
    if (item.type !== 'armor') return;
    refreshAllTokens(item.parent);
  });
}

function refreshAllTokens(actor) {
  if (!canvas?.tokens || !actor) return;
  for (const token of canvas.tokens.placeables) {
    if (token.actor === actor) {
      removeBars(token);
      drawHpBar(token);
      drawArmor(token);
    }
  }
}

/* ─────────── Drawing ─────────── */

function removeBars(token) {
  if (token._tinyBars) {
    token.removeChild(token._tinyBars);
    token._tinyBars.destroy({ children: true });
    token._tinyBars = null;
  }
}

function getContainer(token) {
  if (!token._tinyBars) {
    token._tinyBars = new PIXI.Container();
    token._tinyBars.name = 'tiny6dbar-bars';
    token.addChild(token._tinyBars);
  }
  return token._tinyBars;
}

function drawHpBar(token) {
  const w = token.actor?.system?.wounds;
  if (!w?.max) return;
  const max = w.max;
  const remaining = _readHp(token);
  if (remaining === null) return;

  const container = getContainer(token);
  const barY = -(token.h / 2) - 14;
  const btnW = 10;
  const numW = 16;
  const gap = 2;
  const barH = 13;
  const pad = 3;
  const totalW = pad + btnW + gap + numW + gap + btnW + pad;

  const bg = new PIXI.Graphics();
  _drawFilledRect(bg, -totalW / 2, barY, totalW, barH, 0x111111);
  _drawStrokedRect(bg, -totalW / 2, barY, totalW, barH, 0x555555);
  container.addChild(bg);

  const minusBtn = _makeBtn('-', () => {
    const cur = _readHp(token);
    if (cur !== null && cur > 0) _setTokenHp(token, cur - 1);
  });
  if (minusBtn) {
    minusBtn.anchor.set(0.5, 0.5);
    minusBtn.x = -totalW / 2 + pad + btnW / 2;
    minusBtn.y = barY + barH / 2 - 1;
    container.addChild(minusBtn);
  }

  const hpText = _makeText(String(remaining), {
    fill: remaining > 0 ? 0x44dd44 : 0xdd4444,
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    stroke: 0x000000,
    strokeThickness: 1
  });
  if (hpText) {
    hpText.anchor.set(0.5, 0.5);
    hpText.x = -totalW / 2 + pad + btnW + gap + numW / 2;
    hpText.y = barY + barH / 2 - 1;
    container.addChild(hpText);
  }

  const plusBtn = _makeBtn('+', () => {
    const cur = _readHp(token);
    if (cur !== null && cur < max) _setTokenHp(token, cur + 1);
  });
  if (plusBtn) {
    plusBtn.anchor.set(0.5, 0.5);
    plusBtn.x = -totalW / 2 + pad + btnW + gap + numW + gap + btnW / 2;
    plusBtn.y = barY + barH / 2 - 1;
    container.addChild(plusBtn);
  }
}

function drawArmor(token) {
  const showArmor = game.settings.get('tiny6dbar', 'showTokenArmor');
  if (!showArmor) return;

  let armorTotal = 0;
  for (const item of token.actor.items) {
    if (item.type === 'armor' && item.system.equipped) {
      armorTotal += Number(item.system.damageReduction || 0);
    }
  }
  if (armorTotal <= 0) return;

  const container = getContainer(token);
  const text = _makeText(`\u{1F6E1} ${armorTotal}`, {
    fill: 0x8888ff,
    fontSize: 10,
    fontFamily: 'Arial, sans-serif',
    stroke: 0x000000,
    strokeThickness: 1
  });
  if (!text) return;
  text.anchor.set(0.5, 0);
  text.y = -(token.h / 2) + 2;
  container.addChild(text);
}
