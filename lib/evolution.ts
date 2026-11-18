import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621'
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'gym_bot'

/**
 * Envía un mensaje de texto mediante Evolution API v2 (formato directo { number, text })
 */
export async function sendWhatsAppMessage(
  phone: string,
  text: string,
  instanceName?: string | null
) {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const instance = instanceName || EVOLUTION_INSTANCE
    const url = `${EVOLUTION_API_URL}/message/sendText/${instance}`

    const response = await axios.post(
      url,
      {
        number: cleanPhone,
        text: text,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    return { success: true, data: response.data }
  } catch (error: any) {
    console.error('Error al enviar WhatsApp vía Evolution API:', error?.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Envía una imagen/media mediante Evolution API v2 con fallback automático a texto si falla
 */
export async function sendWhatsAppMedia(
  phone: string,
  mediaUrl: string,
  caption?: string,
  instanceName?: string | null
) {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const instance = instanceName || EVOLUTION_INSTANCE
  const url = `${EVOLUTION_API_URL}/message/sendMedia/${instance}`

  try {
    const response = await axios.post(
      url,
      {
        number: cleanPhone,
        media: mediaUrl,
        mediatype: 'image',
        caption: caption || '',
        delay: 500,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    return { success: true, data: response.data }
  } catch (error: any) {
    console.error('Error al enviar WhatsApp Media, ejecutando fallback a texto:', error?.response?.data || error.message)
    // Fallback: Si no se pudo enviar la imagen, enviamos el texto para no trabar la experiencia del usuario
    if (caption) {
      return await sendWhatsAppMessage(phone, caption, instance)
    }
    return { success: false, error: error.message }
  }
}
