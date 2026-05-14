const fs = require('fs')
const path = require('path')
const ResEdit = require('resedit')

module.exports = async function afterPackIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const productFilename = context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`)
  const iconPath = path.join(context.packager.projectDir, 'resources', 'i-able-logo.ico')

  if (!fs.existsSync(exePath)) {
    throw new Error(`Cannot set app icon because the packaged exe is missing: ${exePath}`)
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Cannot set app icon because the logo icon is missing: ${iconPath}`)
  }

  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), {
    ignoreCert: true,
  })
  const resources = ResEdit.NtExecutableResource.from(exe)
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath))
  const iconGroups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries)
  const iconGroup = iconGroups[0]

  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    iconGroup?.id ?? 1,
    iconGroup?.lang ?? 1033,
    iconFile.icons.map((item) => item.data),
  )

  resources.outputResource(exe)
  fs.writeFileSync(exePath, Buffer.from(exe.generate()))
}
