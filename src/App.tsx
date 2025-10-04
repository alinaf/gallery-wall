import { useState, useEffect } from 'react'
import './App.css'
import artworks from './artworks.json'

interface Artwork {
  id: string
  artist: string
  title: string
  year: number
  image: string
  width: number
  height: number
}

interface PlacedArtwork extends Artwork {
  x: number
  y: number
  frame?: 'none' | 'plain' | 'ornate' | 'washi'
  washiRotation?: boolean // If true, use top-right/bottom-left. If false, use top-left/bottom-right
  washiColor?: string // Color sampled from the image
  woodTexture?: number // 1, 2, or 3 for wood texture
}

function App() {
  const [currentRoom, setCurrentRoom] = useState<'gallery' | 'bedroom'>('gallery')
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

  const getImageColor = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('rgba(255, 182, 193, 0.8)')
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Sample from corner
        const imageData = ctx.getImageData(10, 10, 1, 1).data
        const r = imageData[0]
        const g = imageData[1]
        const b = imageData[2]

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

        // If dark, lighten; if light, darken
        let newR, newG, newB
        if (luminance < 0.5) {
          // Lighten and saturate
          newR = Math.min(255, r + 150)
          newG = Math.min(255, g + 100)
          newB = Math.min(255, b + 120)
        } else {
          // Darken and saturate
          newR = Math.max(0, r - 80)
          newG = Math.max(0, g - 80)
          newB = Math.max(0, b - 80)
        }

        resolve(`rgba(${newR}, ${newG}, ${newB}, 0.8)`)
      }
      img.onerror = () => {
        resolve('rgba(255, 182, 193, 0.8)')
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
      let x = e.clientX - dragOffset.x
      let y = e.clientY - dragOffset.y

      // Constrain to stay below header (approximately 60px)
      y = Math.max(0, y)
      x = Math.max(0, x)

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
      const x = e.clientX - galleryRect.left - dragOffset.x
      const y = e.clientY - galleryRect.top - dragOffset.y

      // Check if artwork is already placed in any room
      const isPlacedInGallery = galleryArtworks.find(a => a.id === draggedArtwork.id)
      const isPlacedInBedroom = bedroomArtworks.find(a => a.id === draggedArtwork.id)

      if (!isPlacedInGallery && !isPlacedInBedroom) {
        const washiColor = await getImageColor(draggedArtwork.image)
        const woodTexture = Math.floor(Math.random() * 3) + 1
        setPlacedArtworks([
          ...placedArtworks,
          { ...draggedArtwork, x, y, washiRotation: Math.random() > 0.5, washiColor, woodTexture }
        ])
      }
      setDraggedArtwork(null)
    }
  }

  const removeArtwork = (id: string) => {
    setPlacedArtworks(placedArtworks.filter(a => a.id !== id))
  }

  return (
    <div className="app">
      <aside className="menu">
        <h2>collection</h2>
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
                      setPlacedArtworks([
                        ...placedArtworks,
                        { ...artwork, x: 100, y: 100, washiRotation: Math.random() > 0.5, washiColor, woodTexture }
                      ])
                    }
                  }}
                >
                  <img src={artwork.image} alt={artwork.title} />
                  <div className="artwork-info">
                    <strong>{artwork.artist}</strong>
                    <span>{artwork.title}</span>
                  </div>
                </div>
                {placedArtwork && (
                  <div className="frame-circles">
                    <button
                      className={`frame-circle ${!placedArtwork.frame || placedArtwork.frame === 'none' ? 'active' : ''}`}
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
                    <button
                      className={`frame-circle frame-circle-ornate ${placedArtwork.frame === 'ornate' ? 'active' : ''}`}
                      onClick={() => {
                        if (currentRoom === 'gallery') {
                          setGalleryArtworks(galleryArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'ornate' } : a
                          ))
                        } else {
                          setBedroomArtworks(bedroomArtworks.map(a =>
                            a.id === artwork.id ? { ...a, frame: 'ornate' } : a
                          ))
                        }
                      }}
                      title="Ornate"
                    />
                    {currentRoom === 'bedroom' && (
                      <button
                        className={`frame-circle frame-circle-washi ${placedArtwork.frame === 'washi' ? 'active' : ''}`}
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
        </div>
        <div className="wall">
          {placedArtworks.map((artwork) => (
            <div
              key={artwork.id}
              className={`placed-artwork ${draggingId === artwork.id ? 'dragging' : ''} ${artwork.frame ? 'frame-' + artwork.frame : ''} ${Math.max(artwork.width, artwork.height) < 150 ? 'small-artwork' : ''} ${artwork.washiRotation ? 'washi-rotated' : ''} ${artwork.woodTexture ? 'wood-' + artwork.woodTexture : ''}`}
              onMouseDown={(e) => handleMouseDown(e, artwork)}
              style={{
                left: artwork.x,
                top: artwork.y,
                width: artwork.width,
                height: artwork.height,
                ...(artwork.washiColor && {
                  '--washi-color': artwork.washiColor
                } as React.CSSProperties)
              }}
            >
              <img src={artwork.image} alt={artwork.title} draggable={false} />
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
  )
}

export default App
