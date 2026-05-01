/**
 * Попап — прямоугольник w×h от точки (cx, cy). Четыре if: вниз-вправо, вниз-влево,
 * вверх-вправо, вверх-влево относительно точки (расстояние от угла до противоположного
 * угла карточки = диагональ скелетона). Иначе — прижать к видимой области.
 */
export const ANCHORED_POPUP_GAP_PX = 8
export const ANCHORED_POPUP_PAD_PX = 8
export const ANCHORED_POPUP_PLAN_WIDTH_PX = 320
export const ANCHORED_POPUP_PLAN_HEIGHT_PX = 368

export function viewportScreenBox() {
  if (typeof window === 'undefined') {
    return {
      screenLeft: 0,
      screenRight: 0,
      screenTop: 0,
      screenBottom: 0,
      winW: 0,
    }
  }
  const vv = window.visualViewport
  const pad = ANCHORED_POPUP_PAD_PX
  const winW = vv?.width ?? window.innerWidth
  const winH = vv?.height ?? window.innerHeight
  const winLeft = vv?.offsetLeft ?? 0
  const winTop = vv?.offsetTop ?? 0
  return {
    screenLeft: winLeft + pad,
    screenRight: winLeft + winW - pad,
    screenTop: winTop + pad,
    screenBottom: winTop + winH - pad,
    winW,
  }
}

function boxFitsScreen(
  left: number,
  top: number,
  w: number,
  h: number,
  sl: number,
  sr: number,
  st: number,
  sb: number,
): boolean {
  return left >= sl && top >= st && left + w <= sr && top + h <= sb
}

/**
 * Четыре if: куда кладём прямоугольник относительно (cx, cy) — по часовой: Вниз-Вправо → Вниз-Влево → Вверх-Вправо → Вверх-Влево.
 * Иначе — прижимаем к экрану без фантазий.
 */
export function pickPopupRectFromPoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  gap: number,
  sl: number,
  sr: number,
  st: number,
  sb: number,
): { left: number; top: number; placeBelow: boolean } {
  const g = gap

  let left = cx + g
  let top = cy + g
  if (boxFitsScreen(left, top, w, h, sl, sr, st, sb))
    return { left, top, placeBelow: true }

  left = cx - g - w
  top = cy + g
  if (boxFitsScreen(left, top, w, h, sl, sr, st, sb))
    return { left, top, placeBelow: true }

  left = cx + g
  top = cy - g - h
  if (boxFitsScreen(left, top, w, h, sl, sr, st, sb))
    return { left, top, placeBelow: false }

  left = cx - g - w
  top = cy - g - h
  if (boxFitsScreen(left, top, w, h, sl, sr, st, sb))
    return { left, top, placeBelow: false }

  left = Math.min(Math.max(cx + g, sl), sr - w)
  top = Math.min(Math.max(cy + g, st), sb - h)
  return { left, top, placeBelow: top > cy }
}
