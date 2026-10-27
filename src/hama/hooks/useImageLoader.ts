import { useState, useCallback } from 'react'
import { useHamaStore } from '@/hama/store/hama.store'
import {
  createPresetDataUrl,
  isSupportedImageType,
  type PresetId,
} from '@/hama/core/presets.const'

export interface UseImageLoaderReturn {
  loadFile: (file: File) => void
  loadPreset: (type: PresetId) => void
  error: string | null
  clearError: () => void
}

/**
 * Hook para la carga de imágenes del usuario (por explorador o drag & drop)
 * y presets rápidos, calculando el aspect ratio natural y actualizando el store.
 */
export function useImageLoader(): UseImageLoaderReturn {
  const [error, setError] = useState<string | null>(null)
  const setImageSrc = useHamaStore((state) => state.setImageSrc)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loadFile = useCallback(
    (file: File) => {
      if (!isSupportedImageType(file.type, file.name)) {
        setError('Formato no soportado. Usa imágenes PNG, JPG, WEBP o SVG.')
        return
      }

      setError(null)
      const reader = new FileReader()

      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        if (!dataUrl) {
          setError('No se pudo obtener el contenido del archivo.')
          return
        }

        const img = new Image()
        img.onload = () => {
          const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1
          setImageSrc(dataUrl, ratio)
        }
        img.onerror = () => {
          setError('Error al decodificar la imagen seleccionada.')
        }
        img.src = dataUrl
      }

      reader.onerror = () => {
        setError('Error al leer el archivo en el navegador.')
      }

      reader.readAsDataURL(file)
    },
    [setImageSrc]
  )

  const loadPreset = useCallback(
    (type: PresetId) => {
      setError(null)
      const dataUrl = createPresetDataUrl(type)
      setImageSrc(dataUrl, 1)
    },
    [setImageSrc]
  )

  return {
    loadFile,
    loadPreset,
    error,
    clearError,
  }
}
