/**
 * script.js
 */

import * as plt from './plot.js'

const FFT_SIZE = 2048
let volume = 1
let delay = 0
let DB_LIM = [-150, -30]

/* 再生状態フラグ類 */
let playbackNow

/* 音声インターフェース類 */
let audioCtx
let sourceNode

/* 基本エフェクト用変数 */
let sourceToEffectNode

let delayNode
let gainNode
let dynamicCompressorNode
let analyserNode

/* ホワイトノイズ用変数 */
let whiteNoiseGain = 1

let whiteNoiseBuffer
let whiteNoiseNode
let whiteNoiseGainNode

/* エコー用変数 */
let echoGain = 0.1
let echoDelay = 0.2
let echoGainNode
let echoDelayNode


/* fftデータ */
let freqDatas
let freqMinDatas
let hzDatas

/* 音声ファイルデータ */
let audioFileBlob
let fileTypeAudio


/**
 * オーディオインターフェースを準備する。
 */
function audioSetUp() {
  if (audioCtx == null) {
    audioCtx = new window.AudioContext();

    /* エフェクト設定 */
    sourceToEffectNode = audioCtx.createDelay()

    delayNode = audioCtx.createDelay(3)
    delayNode.delayTime.value = delay

    gainNode = audioCtx.createGain()
    gainNode.gain.value = volume

    dynamicCompressorNode = audioCtx.createDynamicsCompressor()

    analyserNode = audioCtx.createAnalyser()
    analyserNode.fftSize = FFT_SIZE
    freqDatas = new Float32Array(analyserNode.frequencyBinCount)
    freqMinDatas = new Array(analyserNode.frequencyBinCount)
    hzDatas = new Float32Array(analyserNode.frequencyBinCount)
    for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
      hzDatas[i] = i * audioCtx.sampleRate / analyserNode.fftSize
    }

    sourceToEffectNode.connect(delayNode)
    delayNode.connect(gainNode)
    gainNode.connect(dynamicCompressorNode)
    dynamicCompressorNode.connect(analyserNode)
    analyserNode.connect(audioCtx.destination)

    /* ホワイトノイズエフェクト生成部 */
    whiteNoiseBuffer = audioCtx.createBuffer(1, 8000, 8000)
    let nowBuf = whiteNoiseBuffer.getChannelData(0)
    for (let i = 0; i < nowBuf.length; ++i) {
      nowBuf[i] = (Math.random() * 2 - 1)
    }
    whiteNoiseNode = audioCtx.createBufferSource()
    whiteNoiseNode.buffer = whiteNoiseBuffer
    whiteNoiseNode.loop = true
    whiteNoiseNode.start()
    whiteNoiseGainNode = audioCtx.createGain()
    whiteNoiseGainNode.gain.value = whiteNoiseGain

    whiteNoiseNode.connect(whiteNoiseGainNode)

    /* エコー生成部 */
    echoDelayNode = audioCtx.createDelay(3)
    echoDelayNode.delayTime.value = echoDelay
    echoGainNode = audioCtx.createGain()
    echoGainNode.gain.value = echoGain

    sourceToEffectNode.connect(echoDelayNode)
    echoDelayNode.connect(echoGainNode)
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
 * ホワイトノイズの開始・停止を行う。
 */
function setWhiteNoise(isActive) {
  if (playbackNow) {
    whiteNoiseGainNode.disconnect()
    if (isActive) {
      whiteNoiseGainNode.connect(delayNode)
    }
  }
}


/**
 * エコーの開始・停止を行う。
 */
function setEcho(isActive) {
  if (playbackNow) {
    //sourceToEffectNode.disconnect(echoDelayNode)
    echoGainNode.disconnect()
    if (isActive) {
      //
      echoGainNode.connect(sourceToEffectNode)
    }
  }
}


/**
 * 録音を開始する関数。
 * この関数は常にユーザー操作イベント中に呼び出されなければならない。
 */
function beginMICMode() {
  /*
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  playbackNow = false

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

        sourceNode.connect(sourceToEffectNode)

        playbackNow = true
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
function beginSoundFileMode(file) {
  /**
   * オーディオのあれこれを作成する。
   * ユーザー操作イベント中でないと失敗することがある。 
   */
  playbackNow = false

  audioSetUp()

  audioFileBlob = window.URL.createObjectURL(file)
  fileTypeAudio = new Audio(audioFileBlob)
  sourceNode = audioCtx.createMediaElementSource(fileTypeAudio)

  sourceNode.connect(sourceToEffectNode)

  fileTypeAudio.play()
  playbackNow = true
}




function main() {
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
    if (playbackNow) {
      analyserNode.getFloatFrequencyData(freqDatas)
      fig.limY = DB_LIM
      for (let i = 0; i < analyserNode.frequencyBinCount; i++) {
        freqMinDatas[i] = DB_LIM[0]
      }
    }
    ctx.fillStyle = 'black'
    ctx.fillRect(rect[0], rect[1], rect[2], rect[3])
    if (playbackNow) {
      fig.fill_between(hzDatas, freqDatas, freqMinDatas)
    }

    setTimeout(render, 10)
  }

  render()

  /*
   * 音声関連設定
   */

  function setRangeAttribute(rangeElement, min, max, step, value) {
    rangeElement.min = min
    rangeElement.max = max
    rangeElement.value = value
    rangeElement.step = step
  }

  let beginBtn = document.getElementById('startBtn')
  beginBtn.onclick = () => {
    beginBtn.setAttribute('disabled', 'disabled')
    beginMICMode()
  }
  let fileInput = document.getElementById('fileInput')
  fileInput.value = null
  fileInput.onchange = () => {
    // ボタンが押されたとき再生を開始する。
    beginBtn.removeAttribute('disabled')
    beginSoundFileMode(fileInput.files[0])
  }
  let fileLoop = document.getElementById('fileLoop')
  fileLoop.checked = false
  fileLoop.onchange = () => {
    if (fileTypeAudio) {
      fileTypeAudio.loop = fileLoop.checked
    }
  }

  /* ボリューム設定 */
  let volumeRng = document.getElementById('volRng')
  let volumeVal = document.getElementById('volVal')
  setRangeAttribute(volumeRng, 0, 100, 1, 100)
  volumeRng.oninput = () => {
    volumeVal.innerHTML = volumeRng.value
    volume = volumeRng.value / 100
    if (playbackNow) {
      gainNode.gain.value = volume
    }
  }
  volumeRng.oninput()

  /* 遅延設定 */
  let delayRng = document.getElementById('dlyRng')
  let delayVal = document.getElementById('dlyVal')
  setRangeAttribute(delayRng, 0, 3, 0.1, 0)
  delayRng.oninput = () => {
    delayVal.innerHTML = delayRng.value
    delay = delayRng.value
    if (playbackNow) {
      delayNode.delayTime.value = delay
    }
  }
  delayRng.oninput()

  /* スペクトル表示範囲設定 */
  let vvMinRng = document.getElementById('vvminRng')
  let vvMinVal = document.getElementById('vvminVal')
  setRangeAttribute(vvMinRng, -150, -30, 0.1, -150)
  const vvMinOnIn = () => {
    vvMinVal.innerHTML
      = DB_LIM[0]
      = vvMinRng.value
      = Math.min(vvMinRng.value, DB_LIM[1])
  }
  vvMinRng.oninput = vvMinOnIn
  vvMinOnIn()
  let vvMaxRng = document.getElementById('vvmaxRng')
  let vvMaxVal = document.getElementById('vvmaxVal')
  setRangeAttribute(vvMaxRng, -150, -30, 0.1, -30)
  const vvMaxOnIn = () => {
    vvMaxVal.innerHTML
      = DB_LIM[1]
      = vvMaxRng.value
      = Math.max(vvMaxRng.value, DB_LIM[0])
  }
  vvMaxRng.oninput = vvMaxOnIn
  vvMaxOnIn()

  /* ホワイトノイズの設定 */
  let whiteNoiseCbox = document.getElementById('whiteNoiseCbox')
  whiteNoiseCbox.onchange = () => {
    setWhiteNoise(whiteNoiseCbox.checked)
  }

  let whiteNoiseGainRng = document.getElementById('whiteNoiseGainRng')
  let whiteNoiseGainVal = document.getElementById('whiteNoiseGainVal')
  setRangeAttribute(whiteNoiseGainRng, 0, 100, 1, 100)
  whiteNoiseGainRng.oninput = () => {
    whiteNoiseGainVal.innerHTML = whiteNoiseGainRng.value
    whiteNoiseGain = whiteNoiseGainRng.value / 100
    if (playbackNow) {
      whiteNoiseGainNode.gain.value = whiteNoiseGain
    }
  }
  whiteNoiseGainRng.oninput()

  /* エコーの設定 */
  let echoCbox = document.getElementById('echoCbox')
  echoCbox.onchange = () => {
    setEcho(echoCbox.checked)
  }

  let echoGainRng = document.getElementById('echoGainRng')
  let echoGainVal = document.getElementById('echoGainVal')
  setRangeAttribute(echoGainRng, 0, 100, 1, 100)
  echoGainRng.oninput = () => {
    echoGainVal.innerHTML = echoGainRng.value
    echoGain = echoGainRng.value / 100
    if (playbackNow) {
      echoGainNode.gain.value = echoGain
    }
  }
  echoGainRng.oninput()
  let echoDelayRng = document.getElementById('echoDelayRng')
  let echoDelayVal = document.getElementById('echoDelayVal')
  setRangeAttribute(echoDelayRng, 0, 3, 0.1, 0.5)
  echoDelayRng.oninput = () => {
    echoDelayVal.innerHTML = echoDelayRng.value
    echoDelay = echoDelayRng.value
    if (playbackNow) {
      echoDelayNode.delayTime.value = echoDelay
    }
  }
  echoDelayRng.oninput()
}


main()
