'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// 修正されたアイコン設定（Next.jsでLeafletのデフォルトアイコンが消える問題への対応）
const createCustomIcon = () => {
    return new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
}

// マップの中心を現在地に追従させるコンポーネント
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.flyTo(center, map.getZoom(), { animate: true, duration: 1 })
    }, [center, map])
    return null
}

interface MapViewProps {
    currentPosition: [number, number] | null;
    path: [number, number][];
}

export default function MapView({ currentPosition, path }: MapViewProps) {
    const [icon, setIcon] = useState<L.Icon | null>(null)

    useEffect(() => {
        setIcon(createCustomIcon())
    }, [])

    if (!icon) return null

    const defaultCenter: [number, number] = [35.6895, 139.6917] // Tokyo
    const center = currentPosition || defaultCenter

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={center}
                zoom={16}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                // url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {currentPosition && (
                    <Marker position={currentPosition} icon={icon} />
                )}

                {path.length > 1 && (
                    <Polyline
                        positions={path}
                        color="#14b8a6" // teal-500
                        weight={4}
                        opacity={0.8}
                    />
                )}

                {currentPosition && <MapUpdater center={currentPosition} />}
            </MapContainer>
        </div>
    )
}
