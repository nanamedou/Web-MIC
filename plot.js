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
    /* グラフ内の範囲の最大最小 */
    this.minX = null
    this.maxX = null
    this.minY = null
    this.maxY = null
  }


  /**
   * canvasに線グラフを書く
   * クラス初期化時に範囲設定してもはみ出す
   * @param {number[]} x - グラフのx値配列
   * @param {number[]} y - グラフのy値配列
   * @public
   */
  plot(x, y) {
    let ctx = this.ctx
    let rect = this.rect

    /* 描画される値の範囲を求める */
    let rangeXY = [this.minX, this.maxX, this.minY, this.maxY]
    if (rangeXY[0] == null) {
      rangeXY[0] = min(x)
    }
    if (rangeXY[1] == null) {
      rangeXY[1] = max(x)
    }
    if (rangeXY[2] == null) {
      rangeXY[2] = min(y)
    }
    if (rangeXY[3] == null) {
      rangeXY[3] = max(y)
    }
    const rectFrom = [
      rangeXY[0],
      rangeXY[3],
      rangeXY[1] - rangeXY[0],
      rangeXY[2] - rangeXY[3]]

    /* x-yの値を線でつないで描画 */
    let pos
    pos = transPosInRect(rectFrom, rect, x[0], y[0])
    ctx.moveTo(pos[0], pos[1])
    for (let index = 1; index < x.length; index++) {
      const a = x[index];
      const b = y[index];
      pos = transPosInRect(rectFrom, rect, a, b)

      ctx.lineTo(pos[0], pos[1])
    }
  }
}