/**
 * script.js
 */

import * as plt from './plot.js'

const FFT_SIZE = 2048
let volume = 1
let delay = 0
let DB_LIM = [-150, -30]

let recordingInitialized
/*
 * beginRecord呼び出し時に初期化される変数
 */
let audioCtx
let sourceNode
let gainNode
let delayNode
let analyserNode
let freqDatas
let freqMinDatas
let hzDatas

let audioFileBlob
let fileTypeAudio

/**
 * オーディオインターフェースを準備する。
 */
const audioSetUp = () => {
  if (audioCtx == null) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sourceNode) {
    sourceNode.disconnect()
    sourceNode = null
  }
  if (audioFileBlob) {
    window.URL.revokeObjectURL(audioFileBlob)
    audioFileBlob = null
  }
  if (fileTypeAudio) {
    fileTypeAudio.pause()
    fileTypeAudio = null
  }
}

/**
 * sourceNodeが出力されるまでの流れを設定する
 */
const setPipelines = (sourceNode) => {

  analyserNode = audioCtx.createAnalyser()
  analyserNode.fftSize = FFT_SIZE
  freqDatas = new Float32Array(analyserNode.frequencyBinCount)
  freqMinDatas = new Array(analyserNode.frequencyBinCount)
  hzDatas = new Float32Array(analyserNode.frequencyBinCount)
  for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
    hzDatas[i] = i * audioCtx.sampleRate / analyserNode.fftSize
  }

  gainNode = audioCtx.createGain()
  gainNode.gain.value = volume

  let dynamicCompressorNode = audioCtx.createDynamicsCompressor()

  delayNode = audioCtx.createDelay(3)
  delayNode.delayTime.value = delay


  /* ノードを接続する */
  sourceNode.connect(analyserNode)
  analyserNode.connect(gainNode)
  gainNode.connect(dynamicCompressorNode)
  dynamicCompressorNode.connect(delayNode)
  delayNode.connect(audioCtx.destination)
}


/**
 * 録音を開始する関数。
 * この関数は常にユーザー操作イベント中に呼び出されなければならない。
 */
const beginRecord = () => {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  recordingInitialized = false

  audioSetUp()

  if (navigator.mediaDevices.getUserMedia) {
    // メディア使用権限取得
    navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: false
      }).then((stream) => {

        /* ノードを作成する */
        sourceNode = audioCtx.createMediaStreamSource(stream)

        setPipelines(sourceNode)

        recordingInitialized = true
      }).catch((err) => {
        console.log('メディア初期化に失敗しました。: ' + err)
      })
  } else {
    console.log('navigator.mediaDevices.getUserMedia がサポートされていません。')
  }
}

/**
 * ローカルにある音楽を再生する。
 * 
 * @argument {File} file 再生する対象
 */
const beginFile = (file) => {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  recordingInitialized = false

  audioSetUp()

  audioFileBlob = window.URL.createObjectURL(file)
  fileTypeAudio = new Audio(audioFileBlob)
  sourceNode = audioCtx.createMediaElementSource(fileTypeAudio)

  setPipelines(sourceNode)

  fileTypeAudio.play()
  recordingInitialized = true

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

    beginBtn.setAttribute('disabled', 'disabled')
    beginRecord()
  }
  let fileInput = document.getElementById('fileInput')
  fileInput.onchange = () => {
    // ボタンが押されたとき再生を開始する。
    beginBtn.removeAttribute('disabled')
    beginFile(fileInput.files[0])
  }

  /* ボリューム設定 */
  let volumeRng = document.getElementById('volRng')
  let volumeVal = document.getElementById('volVal')
  volumeRng.min = 0
  volumeRng.max = 10
  volumeRng.value = 1
  volumeRng.step = 0.1
  volumeRng.oninput = () => {
    if (recordingInitialized) {
      gainNode.gain.value = volumeRng.value
    }
    volumeVal.innerHTML
      = volume
      = volumeRng.value
  }
  volumeRng.oninput()

  /* 遅延設定 */
  let delayRng = document.getElementById('dlyRng')
  let delayVal = document.getElementById('dlyVal')
  delayRng.min = 0
  delayRng.max = 3
  delayRng.value = 0
  delayRng.step = 0.1
  delayRng.oninput = () => {
    if (recordingInitialized) {
      delayNode.delayTime.value = delayRng.value
    }
    delayVal.innerHTML
      = delay
      = delayRng.value
  }
  delayRng.oninput()

  /* スペクトル表示範囲設定 */
  let vvMinRng = document.getElementById('vvminRng')
  let vvMinVal = document.getElementById('vvminVal')
  vvMinRng.min = -150
  vvMinRng.max = -30
  vvMinRng.value = -150
  vvMinRng.step = 0.1
  vvMinRng.oninput = () => {
    vvMinVal.innerHTML
      = DB_LIM[0]
      = vvMinRng.value
      = Math.min(vvMinRng.value, DB_LIM[1])
  }
  vvMinRng.oninput()
  let vvMaxRng = document.getElementById('vvmaxRng')
  let vvMaxVal = document.getElementById('vvmaxVal')
  vvMaxRng.min = -150
  vvMaxRng.max = -30
  vvMaxRng.value = -30
  vvMaxRng.step = 0.1
  vvMaxRng.oninput = () => {
    vvMaxVal.innerHTML
      = DB_LIM[1]
      = vvMaxRng.value
      = Math.max(vvMaxRng.value, DB_LIM[0])
  }
  vvMaxRng.oninput()
}

main()
