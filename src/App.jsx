import { useEffect, useRef, useState } from 'react'

const SHARK_MATRIX_B_VALUE = 1

function patchSharkMethod(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer)
  const view = new DataView(arrayBuffer)
  const totalLength = data.length

  function getBoxType(offset) {
    return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])
  }

  function readBox(offset, endLimit) {
    if (offset + 8 > endLimit) throw new Error('File MP4 rusak: box tidak lengkap.')

    let size = view.getUint32(offset, false)
    const type = getBoxType(offset + 4)
    let headerSize = 8
    let realSize = size

    if (size === 1) {
      if (offset + 16 > endLimit) throw new Error(`Box ${type} extended size corrupt.`)
      const high = view.getUint32(offset + 8, false)
      const low = view.getUint32(offset + 12, false)
      realSize = high * 4294967296 + low
      headerSize = 16
    } else if (size === 0) {
      realSize = endLimit - offset
    }

    if (realSize < headerSize || offset + realSize > endLimit) {
      throw new Error(`Ukuran box ${type} tidak valid.`)
    }

    return {
      type,
      offset,
      size: realSize,
      headerSize,
      contentStart: offset + headerSize,
      end: offset + realSize
    }
  }

  function findBox(startOffset, endOffset, wantedType) {
    let off = startOffset

    while (off + 8 <= endOffset) {
      const box = readBox(off, endOffset)
      if (box.type === wantedType) return box
      off = box.end
    }

    return null
  }

  const moovBox = findBox(0, totalLength, 'moov')
  if (!moovBox) throw new Error('Tidak ditemukan box "moov". Pastikan file MP4 valid.')

  const mvhdBox = findBox(moovBox.contentStart, moovBox.end, 'mvhd')
  if (!mvhdBox) throw new Error('Box "mvhd" tidak ditemukan. File bukan MP4 standar.')

  const version = data[mvhdBox.contentStart]
  let matrixOffset

  if (version === 0) {
    matrixOffset = mvhdBox.offset + 44
  } else if (version === 1) {
    matrixOffset = mvhdBox.offset + 56
  } else {
    throw new Error(`Versi mvhd tidak didukung: ${version}`)
  }

  const matrixBOffset = matrixOffset + 4

  if (matrixBOffset + 4 > mvhdBox.end) {
    throw new Error('mvhd terlalu pendek untuk mengakses display matrix.')
  }

  const previousValue = view.getInt32(matrixBOffset, false)
  view.setInt32(matrixBOffset, SHARK_MATRIX_B_VALUE, false)

  return {
    offset: matrixBOffset,
    previousValue,
    newValue: SHARK_MATRIX_B_VALUE
  }
}

function isMp4(file) {
  const name = file.name.toLowerCase()
  return file.type.includes('mp4') || name.endsWith('.mp4')
}

function shortName(name) {
  return name.length > 42 ? `${name.slice(0, 39)}...` : name
}

export default function App() {
  const inputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState({
    text: '⏻ Siap — pilih file MP4',
    state: 'idle'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const blockContext = (event) => event.preventDefault()

    const blockKeys = (event) => {
      const key = event.key.toLowerCase()
      const blocked =
        key === 'f12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && ['u', 's'].includes(key))

      if (blocked) {
        event.preventDefault()
        event.stopPropagation()
        setStatus({
          text: '⚠️ Akses inspect/debug dibatasi untuk menjaga kode tools.',
          state: 'error'
        })
      }
    }

    const blockSelect = (event) => {
      if (event.target?.tagName !== 'INPUT') event.preventDefault()
    }

    document.addEventListener('contextmenu', blockContext)
    document.addEventListener('keydown', blockKeys)
    document.addEventListener('selectstart', blockSelect)

  
  return (
    <main className="page">
      <section className="layout">
        <header className="masthead">
          <div className="brand-block">
            <span className="brand-dot">Z</span>
            <span>ZychoDev</span>
          </div>

          <div className="headline">
            <span className="overline">private browser tool</span>
            <h1>Clean Uploader</h1>
            <p>
              Pilih video MP4, proses langsung di perangkat, lalu hasilnya
              otomatis tersimpan sebagai <b>clean zychodev.mp4</b>.
            </p>
          </div>

          <div className="chips" aria-label="tool info">
            <span>Client-side</span>
            <span>MP4 only</span>
            <span>No server upload</span>
          </div>
        </header>

        <section className="tool-card">
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              className="file-input"
              type="file"
              accept="video/mp4"
              onChange={onInputChange}
            />

            <div className="file-badge">{selectedFile ? 'MP4' : 'ADD'}</div>

            <div className="file-copy">
              <h2>{selectedFile ? shortName(selectedFile.name) : 'Tap untuk pilih video'}</h2>
              <p>
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • tap lagi untuk ganti file`
                  : 'Drag & drop atau pilih file MP4 dari perangkat kamu'}
              </p>
            </div>
          </div>

          <button
            className="primary-button"
            disabled={!selectedFile || isProcessing}
            onClick={patchAndDownload}
          >
            {isProcessing ? 'Memproses...' : 'Clean & Download'}
          </button>

          <div className={`status ${status.state}`}>
            {status.text}
          </div>
        </section>

        <section className="notes">
          <article>
            <span>01</span>
            <h3>Pilih file</h3>
            <p>Gunakan video format MP4 agar proses berjalan normal.</p>
          </article>

          <article>
            <span>02</span>
            <h3>Proses lokal</h3>
            <p>Patch berjalan di browser, bukan upload ke database/server.</p>
          </article>

          <article>
            <span>03</span>
            <h3>Download</h3>
            <p>Output otomatis bernama clean zychodev.mp4.</p>
          </article>
        </section>

        <footer>
          <a href="https://www.tiktok.com/@0x0g0ds" target="_blank" rel="noreferrer">TikTok</a>
          <a href="https://instagram.com/potaldogg" target="_blank" rel="noreferrer">Instagram</a>
        </footer>
      </section>
    </main>
  )
}
