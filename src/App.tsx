import { useState, useEffect } from 'react'
import './App.css'
import artworks from './artworks.json'

interface Artwork {
  id: string
  artist: string
  artistLink?: string
  title: string
  titleLink?: string
  year: string
  image: string
  width: number
  height: number
  didYouKnow?: string
}

interface PlacedArtwork extends Artwork {
  x: number
  y: number
  frame?: 'none' | 'plain' | 'ornate' | 'washi'
  washiRotation?: boolean // If true, use top-right/bottom-left. If false, use top-left/bottom-right
  washiColor?: string // Color sampled from the image
  woodTexture?: number // 1, 2, or 3 for wood texture
  ornateVariation?: number // 1, 2, or 3 for ornate frame variation
}

function App() {
  const [currentRoom, setCurrentRoom] = useState<'gallery' | 'bedroom'>('gallery')
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [galleryArtworks, setGalleryArtworks] = useState<PlacedArtwork[]>(() => {
    const saved = localStorage.getItem('galleryArtworks')
    return saved ? JSON.parse(saved) : []
  })
  const [bedroomArtworks, setBedroomArtworks] = useState<PlacedArtwork[]>(() => {
    const saved = localStorage.getItem('bedroomArtworks')
    return saved ? JSON.parse(saved) : []
  })
  const [draggedArtwork, setDraggedArtwork] = useState<Artwork | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const placedArtworks = currentRoom === 'gallery' ? galleryArtworks : bedroomArtworks
  const setPlacedArtworks = currentRoom === 'gallery' ? setGalleryArtworks : setBedroomArtworks

  useEffect(() => {
    localStorage.setItem('galleryArtworks', JSON.stringify(galleryArtworks))
  }, [galleryArtworks])

  useEffect(() => {
    localStorage.setItem('bedroomArtworks', JSON.stringify(bedroomArtworks))
  }, [bedroomArtworks])

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  const getImagePath = (path: string) => {
    return import.meta.env.BASE_URL + path.replace(/^\//, '')
  }

  const getRandomWashiColor = () => {
    const colors = [
      [255, 182, 193], // pink
      [255, 180, 120], // peach
      [180, 220, 255], // light blue
      [255, 240, 120], // light yellow
      [220, 180, 255], // lavender
      [255, 200, 140]  // light orange
    ]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    return `rgba(${randomColor[0]}, ${randomColor[1]}, ${randomColor[2]}, 0.8)`
  }

  const getImageColor = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(getRandomWashiColor())
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Sample from corner
        let imageData
        try {
          imageData = ctx.getImageData(10, 10, 1, 1).data
        } catch {
          // CORS or security error - fall back to random color
          resolve(getRandomWashiColor())
          return
        }
        const r = imageData[0]
        const g = imageData[1]
        const b = imageData[2]

        // Find the dominant color channel
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const saturation = max === 0 ? 0 : (max - min) / max

        // Always ensure bright, saturated colors for washi tape
        let newR, newG, newB

        // If the color is too unsaturated (gray), pick a random vibrant color
        if (saturation < 0.3) {
          resolve(getRandomWashiColor())
          return
        } else {
          // Lighten and saturate based on dominant color, but ensure minimum brightness
          if (r >= g && r >= b) {
            newR = Math.max(200, Math.min(255, r + 100))
            newG = Math.max(140, Math.min(255, g + 80))
            newB = Math.max(140, Math.min(255, b + 80))
          } else if (g >= r && g >= b) {
            newR = Math.max(140, Math.min(255, r + 80))
            newG = Math.max(200, Math.min(255, g + 100))
            newB = Math.max(140, Math.min(255, b + 80))
          } else {
            newR = Math.max(140, Math.min(255, r + 80))
            newG = Math.max(140, Math.min(255, g + 80))
            newB = Math.max(200, Math.min(255, b + 100))
          }
        }

        resolve(`rgba(${newR}, ${newG}, ${newB}, 0.8)`)
      }
      img.onerror = () => {
        resolve(getRandomWashiColor())
      }
      img.src = imageSrc
    })
  }

  const handleDragStart = (artwork: Artwork) => {
    setDraggedArtwork(artwork)
    setDragOffset({ x: 50, y: 50 })
  }

  const handleMouseDown = (e: React.MouseEvent, artwork: PlacedArtwork) => {
    setDraggingId(artwork.id)
    setDragOffset({
      x: e.clientX - artwork.x,
      y: e.clientY - artwork.y
    })
  }


  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      const galleryRect = e.currentTarget.getBoundingClientRect()
      let x = e.clientX - dragOffset.x
      let y = e.clientY - dragOffset.y - galleryRect.top

      // Constrain to stay below header
      y = Math.max(0, y)
      x = Math.max(0, x)

      // Prevent overlapping with backgrounds
      const artwork = placedArtworks.find(a => a.id === draggingId)
      if (artwork) {
        const artworkHeight = artwork.height * 4

        if (currentRoom === 'gallery') {
          // Gallery: bench is 160px at bottom
          const maxY = window.innerHeight - 60 - 160 - artworkHeight
          y = Math.min(y, maxY)
        } else {
          // Bedroom: bedroom image is 400px at bottom
          const maxY = window.innerHeight - 60 - 400 - artworkHeight
          y = Math.min(y, maxY)
        }
      }

      setPlacedArtworks(placedArtworks.map(a =>
        a.id === draggingId ? { ...a, x, y } : a
      ))
    }
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()

    if (draggedArtwork) {
      const galleryRect = e.currentTarget.getBoundingClientRect()
      let x = e.clientX - galleryRect.left - dragOffset.x
      let y = e.clientY - galleryRect.top - dragOffset.y

      // Prevent overlapping with backgrounds
      const artworkHeight = draggedArtwork.height * 4
      if (currentRoom === 'gallery') {
        // Gallery: bench is 160px at bottom
        const maxY = window.innerHeight - 60 - 160 - artworkHeight
        y = Math.min(Math.max(0, y), maxY)
      } else {
        // Bedroom: bedroom image is 400px at bottom
        const maxY = window.innerHeight - 60 - 400 - artworkHeight
        y = Math.min(Math.max(0, y), maxY)
      }
      x = Math.max(0, x)

      // Check if artwork is already placed in any room
      const isPlacedInGallery = galleryArtworks.find(a => a.id === draggedArtwork.id)
      const isPlacedInBedroom = bedroomArtworks.find(a => a.id === draggedArtwork.id)

      if (!isPlacedInGallery && !isPlacedInBedroom) {
        const washiColor = await getImageColor(draggedArtwork.image)
        const woodTexture = Math.floor(Math.random() * 3) + 1
        const ornateVariation = Math.floor(Math.random() * 3) + 1
        setPlacedArtworks([
          ...placedArtworks,
          { ...draggedArtwork, x, y, washiRotation: Math.random() > 0.5, washiColor, woodTexture, ornateVariation }
        ])
      }
      setDraggedArtwork(null)
    }
  }

  const removeArtwork = (id: string) => {
    setPlacedArtworks(placedArtworks.filter(a => a.id !== id))
  }

  const parseLinksInText = (text: string) => {
    // Parse markdown-style links [text](url)
    const parts = []
    let lastIndex = 0
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add the link
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after the last link
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  return (
    <>
      <div className="mobile-message">
        <h1>🖼️</h1>
        <h2>gallery wall</h2>
        <p>sorry, this only works on desktop!</p>
      </div>
      <div className="app">
      <aside className="menu">
        <h2>collection</h2>
        <p className="public-domain-note">these works are in the <a href="https://en.wikipedia.org/wiki/Public_domain" target="_blank" rel="noopener noreferrer">public domain</a></p>
        <div className="artwork-list">
          {artworks.map((artwork) => {
            const isPlacedInGallery = galleryArtworks.find(a => a.id === artwork.id)
            const isPlacedInBedroom = bedroomArtworks.find(a => a.id === artwork.id)
            const isPlaced = isPlacedInGallery || isPlacedInBedroom
            const placedArtwork = isPlacedInGallery || isPlacedInBedroom
            return (
              <div key={artwork.id} className={`artwork-item ${isPlaced ? 'placed' : ''}`}>
                <div
                  className="artwork-image-wrapper"
                  draggable={!isPlaced}
                  onDragStart={() => handleDragStart(artwork)}
                  onClick={async () => {
                    if (!isPlaced) {
                      const washiColor = await getImageColor(artwork.image)
                      const woodTexture = Math.floor(Math.random() * 3) + 1
                      const ornateVariation = Math.floor(Math.random() * 3) + 1

                      // Calculate safe position that doesn't overlap background
                      let y = 100
                      const artworkHeight = artwork.height * 4
                      if (currentRoom === 'gallery') {
                        const maxY = window.innerHeight - 60 - 160 - artworkHeight
                        y = Math.min(100, Math.max(0, maxY))
                      } else {
                        const maxY = window.innerHeight - 60 - 400 - artworkHeight
                        y = Math.min(100, Math.max(0, maxY))
                      }

                      setPlacedArtworks([
                        ...placedArtworks,
                        { ...artwork, x: 100, y, washiRotation: Math.random() > 0.5, washiColor, woodTexture, ornateVariation }
                      ])
                    }
                  }}
                >
                  <img src={getImagePath(artwork.image)} alt={artwork.title} />
                  <div className="artwork-info">
                    {artwork.artistLink ? (
                      <strong><a href={artwork.artistLink} target="_blank" rel="noopener noreferrer">{artwork.artist}</a></strong>
                    ) : (
                      <strong>{artwork.artist}</strong>
                    )}
                    {artwork.titleLink ? (
                      <span><a href={artwork.titleLink} target="_blank" rel="noopener noreferrer">{artwork.title}</a></span>
                    ) : (
                      <span>{artwork.title}</span>
                    )}
                    <span className="artwork-year">{artwork.year}</span>
                  </div>
                  {artwork.didYouKnow && (
                    <details className="artwork-details" onClick={(e) => e.stopPropagation()}>
                      <summary>did you know...</summary>
                      <div className="artwork-extra-info">
                        <p>{parseLinksInText(artwork.didYouKnow)}</p>
                      </div>
                    </details>
                  )}
                </div>
                {placedArtwork && (
                  <div className="frame-circles">
                    <button
                      className={`frame-circle ${!placedArtwork.frame || placedArtwork.frame === 'none' ? 'active' : ''}`}
                      disabled={
                        (currentRoom === 'gallery' && !isPlacedInGallery) ||
                        (currentRoom === 'bedroom' && !isPlacedInBedroom)
                      }
                      onClick={() => {
                        if (currentRoom === 'gallery') {
                          setGalleryArtworks(galleryArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'none' } : a
                          ))
                        } else {
                          setBedroomArtworks(bedroomArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'none' } : a
                          ))
                        }
                      }}
                      title="None"
                    />
                    <button
                      className={`frame-circle frame-circle-plain ${placedArtwork.frame === 'plain' ? 'active' : ''}`}
                      disabled={
                        (currentRoom === 'gallery' && !isPlacedInGallery) ||
                        (currentRoom === 'bedroom' && !isPlacedInBedroom)
                      }
                      onClick={() => {
                        if (currentRoom === 'gallery') {
                          setGalleryArtworks(galleryArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'plain' } : a
                          ))
                        } else {
                          setBedroomArtworks(bedroomArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'plain' } : a
                          ))
                        }
                      }}
                      title="Plain"
                    />
                    {currentRoom === 'gallery' && (
                      <button
                        className={`frame-circle frame-circle-ornate ${placedArtwork.frame === 'ornate' ? 'active' : ''}`}
                        disabled={!isPlacedInGallery}
                        onClick={() => {
                          setGalleryArtworks(galleryArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'ornate' } : a
                          ))
                        }}
                        title="Ornate"
                      />
                    )}
                    {currentRoom === 'bedroom' && (
                      <button
                        className={`frame-circle frame-circle-washi ${placedArtwork.frame === 'washi' ? 'active' : ''}`}
                        disabled={!isPlacedInBedroom}
                        onClick={() => {
                          setBedroomArtworks(bedroomArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'washi' } : a
                          ))
                        }}
                        title="Washi Tape"
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <main
        className="gallery"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="room-header">
          <button
            className="room-nav"
            onClick={() => setCurrentRoom(currentRoom === 'gallery' ? 'bedroom' : 'gallery')}
          >
            {currentRoom === 'gallery' ? '→ bedroom' : '← gallery'}
          </button>
          <h1>{currentRoom}</h1>
          <button
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <div className={`wall ${currentRoom}-wall`}>
          {placedArtworks.map((artwork) => (
            <div
              key={artwork.id}
              className={`placed-artwork ${draggingId === artwork.id ? 'dragging' : ''} ${artwork.frame ? 'frame-' + artwork.frame : ''} ${Math.max(artwork.width, artwork.height) < 90 ? 'small-artwork' : ''} ${artwork.washiRotation ? 'washi-rotated' : ''} ${artwork.woodTexture ? 'wood-' + artwork.woodTexture : ''} ${artwork.ornateVariation ? 'ornate-' + artwork.ornateVariation : ''}`}
              onMouseDown={(e) => handleMouseDown(e, artwork)}
              style={{
                left: artwork.x,
                top: artwork.y,
                width: artwork.width * 4,
                height: artwork.height * 4,
                ...(artwork.washiColor && {
                  '--washi-color': artwork.washiColor
                } as React.CSSProperties)
              }}
            >
              <img src={getImagePath(artwork.image)} alt={artwork.title} draggable={false} />
              <button
                className="remove-btn"
                onClick={() => removeArtwork(artwork.id)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
    </>
  )
}

export default App
