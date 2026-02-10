export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous') // needed for external images
        image.src = url
    })

export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    displaySize?: { width: number; height: number }
): Promise<string> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('No 2d context')
    }

    // Calculate scale if displaySize is provided
    let scaleX = 1
    let scaleY = 1

    if (displaySize) {
        scaleX = image.naturalWidth / displaySize.width
        scaleY = image.naturalHeight / displaySize.height
    }

    canvas.width = pixelCrop.width * scaleX
    canvas.height = pixelCrop.height * scaleY

    ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    )

    return canvas.toDataURL('image/jpeg', 0.9)
}
