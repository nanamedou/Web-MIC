import * as plt from './plot.js'

const FFT_SIZE = 2048
const DB_LIM = [-150, -30]

/*
 * beginRecord呼び出し時に初期化される変数
 */
let recordingInitialized
let gainNode
let delayNode
let analyserNode
let freqDatas
let freqMinDatas
let hzDatas

/**
 * 録音を開始する関数。
 * この関数は常にユーザー操作イベント中に呼び出さあれなければならない。
 */
const beginRecord = () => {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  /**
   * @type {AudioContext}
   */
  let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (navigator.mediaDevices.getUserMedia) {
    // メディア使用権限取得
    navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: false
      }).then((stream) => {

        /* ノードを作成する */
        let sourceNode = audioCtx.createMediaStreamSource(stream)

        analyserNode = audioCtx.createAnalyser()
        analyserNode.fftSize = FFT_SIZE
        freqDatas = new Float32Array(analyserNode.frequencyBinCount)
        freqMinDatas = new Array(analyserNode.frequencyBinCount)
        hzDatas = new Float32Array(analyserNode.frequencyBinCount)
        for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
          hzDatas[i] = i * audioCtx.sampleRate / analyserNode.fftSize
        }

        gainNode = audioCtx.createGain()
        gainNode.gain.value = 1

        let dynamicCompressorNode = audioCtx.createDynamicsCompressor()

        delayNode = audioCtx.createDelay(3)
        delayNode.delayTime.value = 0

        /* ノードを接続する */
        sourceNode.connect(analyserNode)
        analyserNode.connect(gainNode)
        gainNode.connect(dynamicCompressorNode)
        dynamicCompressorNode.connect(delayNode)
        delayNode.connect(audioCtx.destination)

        recordingInitialized = true
      }).catch((err) => {
        console.log('メディア初期化に失敗しました。: ' + err)
      })
  } else {
    console.log('navigator.mediaDevices.getUserMedia がサポートされていません。')
  }
}

const main = () => {
  /* 
   * 描画関連設定
   */

  /* Canvas要素の定義など */
  let cs = document.getElementById('canvas')
  /**
   * @type {CanvasRenderingContext2D}
   */
  let ctx = cs.getContext('2d')

  /* 描画用データ宣言 */
  const rect = [0, 0, cs.width, cs.height]
  let fig = new plt.Figure(ctx, rect)

  let figStyle = ctx.createLinearGradient(0, 0, cs.width, 0)
  figStyle.addColorStop(0, 'red')
  figStyle.addColorStop(0.25, 'yellow')
  figStyle.addColorStop(0.5, 'green')
  figStyle.addColorStop(0.75, 'blue')
  figStyle.addColorStop(1, 'violet')
  fig.style = figStyle

  /* 描画関数 */
  let render = () => {
    if (recordingInitialized) {
      analyserNode.getFloatFrequencyData(freqDatas)
      fig.limY = DB_LIM
      for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
        freqMinDatas[i] = DB_LIM[0]
      }
    }
    ctx.fillStyle = 'black'
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
    if (recordingInitialized) {
      fig.fill_between(hzDatas, freqDatas, freqMinDatas)
    }

    setTimeout(render, 10)
  }

  render()

  /*
   * 音声関連設定
   */

  let beginBtn = document.getElementById('startBtn')
  beginBtn.onclick = () => {
    // ボタンが押されたとき録音を開始する。
    // このときボタンは無効化される。
    beginBtn.setAttribute('disabled', 'disabled')
    beginRecord()
  }

  /* ボリューム設定 */
  let volumeRng = document.getElementById('volRng')
  volumeRng.oninput = () => {
    if (recordingInitialized) {
      gainNode.gain.value = volumeRng.value
    }
  }

  /* 遅延設定 */
  let delayRng = document.getElementById('dlyRng')
  delayRng.oninput = () => {
    if (recordingInitialized) {
      delayNode.delayTime.value = delayRng.value
    }
  }

  /* fft範囲設定 */
  let vvMinRng = document.getElementById('vvminRng')
  vvMinRng.oninput = () => {
    if (recordingInitialized) {
      DB_LIM[0] = vvMinRng.value = Math.min(vvMinRng.value, DB_LIM[1])
    }
  }
  let vvMaxRng = document.getElementById('vvmaxRng')
  vvMaxRng.oninput = () => {
    if (recordingInitialized) {
      DB_LIM[1] = vvMaxRng.value = Math.max(vvMaxRng.value, DB_LIM[0])
    }
  }
}

main()
