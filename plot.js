/**
 * plot.js
 */

'use strict'

const max = (array) => {
  let k = array[0]
  for (let i = 1; i < array.length; i++) {
    if (k < array[i]) {
      k = array[i]
    }
  }
  return k
}

const min = (array) => {
  let k = array[0]
  for (let i = 1; i < array.length; i++) {
    if (k > array[i]) {
      k = array[i]
    }
  }
  return k
}

const max2 = (array) => {
  let k = max(array[0])
  for (let i = 1; i < array.length; i++) {
    const s = max(array[i])
    if (k < array[i]) {
      k = s
    }
  }
  return k
}

const min2 = (array) => {
  let k = min(array[0])
  for (let i = 1; i < array.length; i++) {
    const s = min(array[i])
    if (k < array[i]) {
      k = s
    }
  }
  return k
}


/**
 * 
 * @param {number[]} rectFrom - 左上右下の配列
 * @param {number[]} rectTo - 左上右下の配列
 * @param {number[]} x - グラフのx値
 * @param {number[]} y - グラフのy値
 */
const transPosInRect = (rectFrom, rectTo, x, y) => {
  const rx = (x - rectFrom[0]) / rectFrom[2]
  const ry = (y - rectFrom[1]) / rectFrom[3]
  const cx = rectTo[2] * rx + rectTo[0]
  const cy = rectTo[3] * ry + rectTo[1]
  return [cx, cy]
}


export class Figure {
  /**
   * @param {CanvasRenderingContext2D} context- キャンバスの描画コンテキスト
   * @param {number[]} rect - 左上右下の配列描画範囲
   * @public
   */
  constructor(context, rect) {
    this.ctx = context
    this.rect = rect
    /* グラフ内の範囲の最小最大 */
    this.limX = [null, null]
    this.limY = [null, null]
  }


  calcRectFrom(ax, ay) {
    let rangeXY = [this.limX[0], this.limX[1], this.limY[0], this.limY[1]]
    if (rangeXY[0] == null) {
      rangeXY[0] = min2(ax)
    }
    if (rangeXY[1] == null) {
      rangeXY[1] = max2(ax)
    }
    if (rangeXY[2] == null) {
      rangeXY[2] = min2(ay)
    }
    if (rangeXY[3] == null) {
      rangeXY[3] = max2(ay)
    }
    return [
      rangeXY[0],
      rangeXY[3],
      rangeXY[1] - rangeXY[0],
      rangeXY[2] - rangeXY[3]]
  }


  clipRect() {
    let ctx = this.ctx
    let rect = this.rect
    ctx.beginPath()
    ctx.rect(rect[0], rect[1], rect[2], rect[3])
    ctx.closePath()
    ctx.clip()
  }


  /**
   * canvasに折れ線グラフを書く
   * @param {number[]} x - グラフのx値配列
   * @param {number[]} y - グラフのy値配列
   * @public
   */
  plot(x, y) {
    let ctx = this.ctx
    let rect = this.rect

    /* 描画される値の範囲を求める */
    const rectFrom = this.calcRectFrom([x], [y])

    /* x-yの値を線でつないで描画 */
    ctx.save()

    // 範囲選択
    this.clipRect()

    ctx.strokeStyle = this.style
    if (!ctx.strokeStyle) {
      ctx.strokeStyle = 'blue'
    }

    let pos
    ctx.beginPath()
    pos = transPosInRect(rectFrom, rect, x[0], y[0])
    ctx.moveTo(pos[0], pos[1])
    for (let index = 1; index < x.length; index++) {
      const a = x[index];
      const b = y[index];
      pos = transPosInRect(rectFrom, rect, a, b)
      ctx.lineTo(pos[0], pos[1])
    }
    ctx.stroke()

    ctx.restore()
  }


  /**
   * canvasの2曲線の間の領域のを塗りつぶす
   * @param {number[]} x - グラフのx値配列
   * @param {number[]} y0 - グラフのy値配列
   * @param {number[]} y1 - グラフのy値配列
   * @public
   */
  fill_between(x, y0, y1) {
    let ctx = this.ctx
    let rect = this.rect

    /* 描画される値の範囲を求める */
    const rectFrom = this.calcRectFrom([x], [y0, y1])

    /* x-yの値を線でつないで描画 */
    ctx.save()

    // 範囲選択
    this.clipRect()

    ctx.fillStyle = this.style
    if (!ctx.fillStyle) {
      ctx.fillStyle = 'blue'
    }

    let pos
    ctx.beginPath()
    pos = transPosInRect(rectFrom, rect, x[0], y0[0])
    ctx.moveTo(pos[0], pos[1])
    for (let index = 1; index < x.length; index++) {
      const a = x[index]
      const b = y0[index]
      pos = transPosInRect(rectFrom, rect, a, b)
      ctx.lineTo(pos[0], pos[1])
    }
    for (let index = x.length - 1; index >= 0; index--) {
      const a = x[index]
      const b = y1[index]
      pos = transPosInRect(rectFrom, rect, a, b)
      ctx.lineTo(pos[0], pos[1])
    }
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
}
