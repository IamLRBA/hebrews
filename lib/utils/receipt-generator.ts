/**
 * Utility functions for generating and downloading receipt images
 */

export interface ReceiptImageOptions {
  width?: number
  height?: number
  backgroundColor?: string
  quality?: number
}

/**
 * Generate receipt image from HTML element using html2canvas
 * Falls back to server-side generation if html2canvas is not available
 */
export async function generateReceiptImage(
  element: HTMLElement,
  options: ReceiptImageOptions = {}
): Promise<string> {
  const {
    width = 800,
    height,
    backgroundColor = '#ffffff',
    quality = 1.0
  } = options

  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default
    
    const canvas = await html2canvas(element, {
      width,
      height,
      backgroundColor,
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        // Ensure all elements are visible in the cloned document
        const clonedElement = clonedDoc.querySelector('[data-receipt]') as HTMLElement
        if (clonedElement) {
          clonedElement.style.display = 'block'
          clonedElement.style.visibility = 'visible'
        }
      }
    })

    return canvas.toDataURL('image/png', quality)
  } catch (error) {
    console.error('Error generating receipt image:', error)
    throw new Error('Failed to generate receipt image')
  }
}

/**
 * Download image data URL as a file
 */
export function downloadImage(dataUrl: string, filename: string): void {
  try {
    // Create a temporary link element
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error downloading image:', error)
    throw new Error('Failed to download receipt')
  }
}

/**
 * Download receipt as image
 */
export async function downloadReceipt(
  element: HTMLElement,
  orderId: string,
  options?: ReceiptImageOptions
): Promise<void> {
  try {
    // Show loading state (you can add a loading indicator here)
    
    // Generate image
    const dataUrl = await generateReceiptImage(element, options)
    
    // Create filename with order ID and timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `MysticalPIECES_Receipt_${orderId}_${timestamp}.png`
    
    // Download the image
    downloadImage(dataUrl, filename)
  } catch (error) {
    console.error('Error downloading receipt:', error)
    alert('Failed to download receipt. Please try again.')
  }
}

