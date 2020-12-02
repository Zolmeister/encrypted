const concatUint8 = (a, b) => {
  const c = new Uint8Array(a.byteLength + b.byteLength)
  c.set(a)
  c.set(b, a.byteLength)
  return c
}

const pwhash = (salt, passphrase) =>
  sodium.crypto_pwhash(
    sodium.crypto_kdf_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13)

const encrypt = async function(message, passphrase = window.prompt('Passphrase:')) {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const salt = nonce.slice(0, sodium.crypto_pwhash_SALTBYTES)
  const passphraseKey = pwhash(salt, passphrase)
  return sodium.to_base64(concatUint8(nonce, sodium.crypto_secretbox_easy(message, nonce, passphraseKey)))
}

const decrypt = async function(blob, passphrase = window.prompt('Passphrase:')) {
  blob = sodium.from_base64(blob)
  const nonce = blob.slice(0, sodium.crypto_secretbox_NONCEBYTES)
  const salt = nonce.slice(0, sodium.crypto_pwhash_SALTBYTES)
  const ciphertext = blob.slice(sodium.crypto_secretbox_NONCEBYTES)
  const passphraseKey = pwhash(salt, passphrase)
  return sodium.to_string(sodium.crypto_secretbox_open_easy(ciphertext, nonce, passphraseKey).buffer)
}

window.sodium = {
  onload: sodium => {
    document.addEventListener('copy', async function(e) {
      e.preventDefault()
      navigator.clipboard.writeText(await encrypt(window.getSelection().toString()))
    })

    document.addEventListener('paste', async function(e) {
      e.preventDefault()
      const plaintext = await decrypt(e.clipboardData.getData('text'))
      const selection = window.getSelection()
      if (!selection.rangeCount) return false
      selection.deleteFromDocument()
      selection.getRangeAt(0).insertNode(document.createTextNode(plaintext))
      selection.collapseToEnd()
    })

    const $text = document.getElementById('text')
    $text.setAttribute('contenteditable', true)
    $text.focus()
  }
}
