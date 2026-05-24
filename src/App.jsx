import { useRef, useState } from 'react'

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

  function handleFile(file) {
    if (!file) {
      setSelectedFile(null)
      setStatus({ text: '⏻ Belum ada file dipilih', state: 'idle' })
      return
    }

    if (!isMp4(file)) {
      setSelectedFile(null)
      setStatus({ text: '⚠️ Harap pilih file MP4 yang valid.', state: 'error' })
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    setStatus({ text: `✓ Siap: ${shortName(file.name)}`, state: 'idle' })
  }

  function onInputChange(event) {
    handleFile(event.target.files?.[0])
  }

  function onDragOver(event) {
    event.preventDefault()
    setDragActive(true)
  }

  function onDragLeave(event) {
    event.preventDefault()
    setDragActive(false)
  }

  function onDrop(event) {
    event.preventDefault()
    setDragActive(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  async function patchAndDownload() {
    if (!selectedFile) {
      setStatus({ text: '❌ Pilih file terlebih dahulu.', state: 'error' })
      return
    }

    setIsProcessing(true)
    setStatus({ text: '🔧 Memproses: mencari mvhd & menerapkan patch matrix...', state: 'processing' })

    try {
      const arrayBuffer = await selectedFile.arrayBuffer()
      const patchResult = patchSharkMethod(arrayBuffer)

      setStatus({
        text: `✓ matrix_b berubah: ${patchResult.previousValue} → ${patchResult.newValue}. Membuat file download...`,
        state: 'processing'
      })

      const patchedBlob = new Blob([arrayBuffer], { type: selectedFile.type || 'video/mp4' })
      const downloadUrl = URL.createObjectURL(patchedBlob)
      const a = document.createElement('a')

      a.href = downloadUrl
      a.download = "clean zychodev.mp4"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      setStatus({
        text: `✅ Sukses! File "${selectedFile.name}" sudah dipatch & diunduh.`,
        state: 'success'
      })
    } catch (error) {
      let errorMsg = error.message || 'Terjadi kesalahan saat memproses MP4.'

      if (errorMsg.includes('moov')) {
        errorMsg = 'Tidak ditemukan struktur moov. Hanya file MP4 standar yang didukung.'
      } else if (errorMsg.includes('mvhd')) {
        errorMsg = 'Tidak dapat menemukan mvhd. Pastikan file MP4 valid.'
      }

      setStatus({ text: `❌ Gagal: ${errorMsg}`, state: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }



  return (
    <main className="page">
      <section className="container">
        <header className="header">
          <div>
            <p className="label">ZychoDev Tools</p>
            <h1>Clean Uploader</h1>
            <p className="subtitle">
              Bersihkan metadata video MP4 langsung dari browser kamu.
            </p>
          </div>
        </header>

        <section className="panel">
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

            <div className="file-mark">{selectedFile ? 'MP4' : '+'}</div>
            <h2>{selectedFile ? shortName(selectedFile.name) : 'Pilih video MP4'}</h2>
            <p>
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • ketuk untuk mengganti file`
                : 'Ketuk area ini untuk memilih file dari perangkat kamu'}
            </p>
          </div>

          <button
            className="primary-button"
            disabled={!selectedFile || isProcessing}
            onClick={patchAndDownload}
          >
            {isProcessing ? 'Memproses video...' : 'Clean & Download'}
          </button>

          <div className={`status ${status.state}`}>
            {status.text}
          </div>
        </section>

        <section className="steps">
          <div className="step">
            <span>1</span>
            <div>
              <h3>Pilih file</h3>
              <p>Gunakan video dengan format MP4.</p>
            </div>
          </div>

          <div className="step">
            <span>2</span>
            <div>
              <h3>Proses otomatis</h3>
              <p>File diproses langsung di browser.</p>
            </div>
          </div>

          <div className="step">
            <span>3</span>
            <div>
              <h3>Download hasil</h3>
              <p>Hasil tersimpan sebagai clean zychodev.mp4.</p>
            </div>
          </div>
        </section>

        <footer>
          <a href="https://www.tiktok.com/@0x0g0ds" target="_blank" rel="noreferrer">TikTok</a>
          <a href="https://instagram.com/potaldogg" target="_blank" rel="noreferrer">Instagram</a>
        </footer>
      </section>
    </main>
  )
}
