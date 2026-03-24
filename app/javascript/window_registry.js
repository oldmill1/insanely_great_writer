const documentWindowDefinition = {
  kind: "document",
  defaultSize: { width: 760, height: 520 },
  controls: ["close", null, "open-document"],
  loadingText: "Loading document...",
  normalizeItemId(itemId) {
    return itemId == null || itemId === "" ? null : String(itemId)
  },
  buildFrameId(itemId) {
    if (!itemId) return null
    return `document_window_${itemId}_content`
  },
  buildFrameSrc(itemId, frameId) {
    if (!itemId || !frameId) return null
    return `/docs/${itemId}?terminal_frame_id=${encodeURIComponent(frameId)}`
  },
  buildDataset(itemId) {
    if (!itemId) return {}

    return {
      documentPath: `/docs/${itemId}`
    }
  }
}

const folderWindowDefinition = {
  kind: "folder",
  defaultSize: { width: 680, height: 440 },
  controls: ["close", null, null],
  loadingText: "Loading folder...",
  normalizeItemId(itemId) {
    return itemId == null || itemId === "" ? null : String(itemId)
  },
  buildFrameId(itemId) {
    return itemId ? `folder_window_${itemId}_content` : "folder_window_root_content"
  },
  buildFrameSrc(itemId, frameId) {
    if (!frameId) return null
    return itemId
      ? `/folders/${itemId}?frame_id=${encodeURIComponent(frameId)}`
      : `/folders/root?frame_id=${encodeURIComponent(frameId)}`
  },
  buildDataset() {
    return {}
  }
}

export const WINDOW_REGISTRY = {
  document: documentWindowDefinition,
  folder: folderWindowDefinition
}

export function windowDefinitionFor(kind) {
  if (!kind) return null

  return WINDOW_REGISTRY[String(kind)] || null
}

export function buildWindowConfig(kind, itemId, titleText, options = {}) {
  const definition = windowDefinitionFor(kind)
  if (!definition) return null

  const normalizedItemId = definition.normalizeItemId ? definition.normalizeItemId(itemId) : itemId
  const frameId = options.frameId || definition.buildFrameId(normalizedItemId)
  const frameSrc = options.frameSrc || definition.buildFrameSrc(normalizedItemId, frameId)
  if (!frameId || !frameSrc) return null

  return {
    kind: definition.kind,
    itemId: normalizedItemId || "",
    titleText,
    width: options.width || definition.defaultSize.width,
    height: options.height || definition.defaultSize.height,
    frameId,
    frameSrc,
    loadingText: options.loadingText || definition.loadingText,
    controls: options.controls || definition.controls,
    dataset: {
      ...definition.buildDataset(normalizedItemId),
      ...(options.dataset || {})
    }
  }
}
