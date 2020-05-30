import './index.css'

const {crypto, atob, btoa, prompt, getSelection} = window
const encoder = new TextEncoder()
const encode = encoder.encode.bind(encoder)
const $text = document.getElementById('text')
$text.focus()

const concatUint8 = (a, b) => {
  const c = new Uint8Array(a.byteLength + b.byteLength)
  c.set(a)
  c.set(b, a.byteLength)
  return c
}

const bytesToString = (bytes) => {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
  }
  return binary
}

const encrypt = async function(string, passphrase = prompt()) {
  const plaintext = encode(string)
  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', encode(passphrase)),
    'AES-GCM',
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const arrayBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    plaintext
  )

  return btoa(bytesToString(concatUint8(iv, new Uint8Array(arrayBuffer))))
}

const decrypt = async function(string, passphrase = prompt()) {
  const encrypted = Uint8Array.from(atob(string), c => c.charCodeAt(0))
  const [iv, ciphertext] = [encrypted.slice(0, 12), encrypted.slice(12)]
  console.log(iv, ciphertext)

  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', encode(passphrase)),
    'AES-GCM',
    false,
    ['decrypt']
  )

  const arrayBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  )

  return bytesToString(new Uint8Array(arrayBuffer))
}

document.addEventListener('copy', async function(e) {
  e.preventDefault()
  return navigator.clipboard.writeText(await encrypt(getSelection().toString()))
})

document.addEventListener('paste', async function(e) {
  e.preventDefault()
  const plaintext = await decrypt(e.clipboardData.getData('text'))
  const selection = getSelection()
  if (!selection.rangeCount) return false
  selection.deleteFromDocument()
  selection.getRangeAt(0).insertNode(document.createTextNode(plaintext))
  selection.collapseToEnd()
})
