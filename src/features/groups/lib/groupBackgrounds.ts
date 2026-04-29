const modules = import.meta.glob('../../../../fotos grupo/*.{avif,gif,jpeg,jpg,png,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

export type GroupBackgroundOption = {
  fileName: string
  label: string
  url: string
  value: string
}

function getFileName(path: string) {
  return path.split('/').pop() ?? path
}

function formatLabel(fileName: string) {
  const name = fileName.replace(/\.[^.]+$/, '')
  const spaced = name
    .replace(/[-_]+/g, ' ')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .trim()

  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Imagem'
}

function matchesValue(option: GroupBackgroundOption, value: string) {
  return (
    option.value === value ||
    option.url === value ||
    option.fileName === value ||
    value.endsWith(`/fotos-grupo/${option.fileName}`) ||
    value.endsWith(`/fotos grupo/${option.fileName}`)
  )
}

export const GROUP_BACKGROUND_OPTIONS = Object.entries(modules)
  .map(([path, url]) => {
    const fileName = getFileName(path)

    return {
      fileName,
      label: formatLabel(fileName),
      url,
      value: `fotos-grupo/${fileName}`,
    }
  })
  .sort((first, second) => collator.compare(first.label, second.label))

export const DEFAULT_GROUP_BACKGROUND_URL =
  GROUP_BACKGROUND_OPTIONS[0]?.url ?? '/casal-fundo.png'

export function getGroupBackgroundValue(value?: string | null) {
  if (!value) return GROUP_BACKGROUND_OPTIONS[0]?.value ?? ''

  return GROUP_BACKGROUND_OPTIONS.find((option) => matchesValue(option, value))?.value ?? value
}

export function resolveGroupBackgroundUrl(value?: string | null) {
  if (!value) return DEFAULT_GROUP_BACKGROUND_URL

  return GROUP_BACKGROUND_OPTIONS.find((option) => matchesValue(option, value))?.url ?? value
}

export function pickRandomGroupBackgroundValue() {
  if (GROUP_BACKGROUND_OPTIONS.length === 0) return ''
  const index = Math.floor(Math.random() * GROUP_BACKGROUND_OPTIONS.length)
  return GROUP_BACKGROUND_OPTIONS[index].value
}
