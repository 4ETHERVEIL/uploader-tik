export default function App() {
  return (
    <div className="page">
      <div className="box">
        <span className="tag">ZychoDev</span>

        <h1>MP4 Clean Uploader</h1>

        <p className="desc">
          React + Vite version dengan UI neobrutalism.
        </p>

        <div className="upload-area">
          <input type="file" accept="video/mp4,video/quicktime" />
        </div>

        <button className="btn">Upload File</button>

        <div className="cards">
          <div className="card">
            <h3>Fast</h3>
            <p>Powered by Vite.</p>
          </div>

          <div className="card yellow">
            <h3>Modern UI</h3>
            <p>Neobrutalism style.</p>
          </div>

          <div className="card pink">
            <h3>Responsive</h3>
            <p>Desktop & mobile ready.</p>
          </div>
        </div>
      </div>
    </div>
  )
}