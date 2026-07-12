import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import AdmZip from 'adm-zip'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Файл не найден' })
  }

  const fileField = formData.find((f) => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Файл не найден в запросе' })
  }

  const filename = fileField.filename?.toLowerCase() || ''

  try {
    let dumpStr = ''
    let assets: string[] = []

    if (filename.endsWith('.json')) {
      dumpStr = fileField.data.toString('utf-8')
    } else if (filename.endsWith('.zip')) {
      // Read ZIP from buffer in memory
      const zip = new AdmZip(fileField.data)
      const zipEntries = zip.getEntries()
      
      const dataEntry = zipEntries.find(e => e.entryName === 'data.json')
      if (!dataEntry) {
        throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Файл data.json не найден внутри архива' })
      }
      
      dumpStr = dataEntry.getData().toString('utf-8')
      
      assets = zipEntries
        .filter(e => !e.isDirectory && e.entryName !== 'data.json')
        .map(e => e.entryName)
    } else {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Неподдерживаемый формат файла' })
    }

    const dump = JSON.parse(dumpStr)
    return { success: true, dump, assets }

  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: err.message || 'Ошибка обработки файла' })
  }
})
