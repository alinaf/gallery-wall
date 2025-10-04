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
  washiCorners?: [number, number] // Random corners for washi tape: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
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
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (draggedArtwork) {
      const galleryRect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - galleryRect.left - dragOffset.x
      const y = e.clientY - galleryRect.top - dragOffset.y

      // Check if artwork is already placed in any room
      const isPlacedInGallery = galleryArtworks.find(a => a.id === draggedArtwork.id)
      const isPlacedInBedroom = bedroomArtworks.find(a => a.id === draggedArtwork.id)

      if (!isPlacedInGallery && !isPlacedInBedroom) {
        // Pick random opposite corners: 0-3 (top-left/bottom-right) or 1-2 (top-right/bottom-left)
        const oppositeCorners: [number, number] = Math.random() < 0.5 ? [0, 3] : [1, 2]
        setPlacedArtworks([
          ...placedArtworks,
          { ...draggedArtwork, x, y, washiCorners: oppositeCorners }
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
                  onClick={() => {
                    if (!isPlaced) {
                      // Pick random opposite corners: 0-3 (top-left/bottom-right) or 1-2 (top-right/bottom-left)
                      const oppositeCorners: [number, number] = Math.random() < 0.5 ? [0, 3] : [1, 2]
                      setPlacedArtworks([
                        ...placedArtworks,
                        { ...artwork, x: 100, y: 100, washiCorners: oppositeCorners }
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
              className={`placed-artwork ${draggingId === artwork.id ? 'dragging' : ''} ${artwork.frame ? 'frame-' + artwork.frame : ''} ${Math.max(artwork.width, artwork.height) < 150 ? 'small-artwork' : ''}`}
              onMouseDown={(e) => handleMouseDown(e, artwork)}
              data-washi-corner-1={artwork.washiCorners?.[0]}
              data-washi-corner-2={artwork.washiCorners?.[1]}
              style={{
                left: artwork.x,
                top: artwork.y,
                width: artwork.width,
                height: artwork.height
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
