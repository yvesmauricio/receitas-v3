const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const DRIVE_FILE_NAME = 'receitas-v3-backup.json'
const DRIVE_APP_PROPERTY_KEY = 'app'
const DRIVE_APP_PROPERTY_VALUE = 'receitas-v3'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''

let scriptPromise = null
let tokenClient = null
let accessToken = null

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function ensureConfigured() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Drive nao configurado')
  }
}

function ensureBrowserSupport() {
  if (!isBrowser()) {
    throw new Error('Google Drive indisponivel neste ambiente')
  }
}

function loadGoogleIdentityScript() {
  ensureBrowserSupport()
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar Google Identity Services')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

async function getToken({ prompt = 'consent' } = {}) {
  ensureConfigured()
  await loadGoogleIdentityScript()

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: () => {}
    })
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response?.error) {
        reject(new Error(response.error))
        return
      }
      accessToken = response.access_token
      resolve(accessToken)
    }

    try {
      tokenClient.requestAccessToken({
        prompt: accessToken ? '' : prompt
      })
    } catch {
      reject(new Error('Nao foi possivel autenticar no Google'))
    }
  })
}

async function driveFetch(url, options = {}, retry = true) {
  const token = accessToken || await getToken({ prompt: '' }).catch(() => getToken({ prompt: 'consent' }))
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })

  if (response.status === 401 && retry) {
    accessToken = null
    await getToken({ prompt: 'consent' })
    return driveFetch(url, options, false)
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Google Drive respondeu com erro ${response.status}`)
  }

  return response
}

function createMultipartBody(metadata, content) {
  const boundary = `receitasv3-${Math.random().toString(16).slice(2)}`
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`

  return { boundary, body }
}

async function findBackupFile() {
  const query = [
    `name='${DRIVE_FILE_NAME}'`,
    "trashed=false",
    `'appDataFolder' in parents`,
    `appProperties has { key='${DRIVE_APP_PROPERTY_KEY}' and value='${DRIVE_APP_PROPERTY_VALUE}' }`
  ].join(' and ')

  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('spaces', 'appDataFolder')
  url.searchParams.set('q', query)
  url.searchParams.set('fields', 'files(id,name,modifiedTime)')
  url.searchParams.set('pageSize', '1')
  url.searchParams.set('orderBy', 'modifiedTime desc')

  const response = await driveFetch(url.toString())
  const data = await response.json()
  return data.files?.[0] || null
}

export function isGoogleDriveBackupConfigured() {
  return Boolean(GOOGLE_CLIENT_ID)
}

export async function salvarBackupNoDrive(backup) {
  ensureConfigured()
  const existingFile = await findBackupFile()
  const metadata = {
    name: DRIVE_FILE_NAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
    appProperties: {
      [DRIVE_APP_PROPERTY_KEY]: DRIVE_APP_PROPERTY_VALUE
    }
  }
  const content = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    backup
  })
  const { boundary, body } = createMultipartBody(metadata, content)
  const endpoint = existingFile
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  const method = existingFile ? 'PATCH' : 'POST'

  await driveFetch(endpoint, {
    method,
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  })
}

export async function restaurarBackupDoDrive() {
  ensureConfigured()
  const file = await findBackupFile()
  if (!file) {
    throw new Error('Nenhum backup encontrado no Google Drive')
  }

  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)
  const data = await response.json()
  return data?.backup || data
}
