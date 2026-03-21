import { Controller } from "@hotwired/stimulus"

const SAVE_IDLE_MS = 2000

const ELEMENT_STARTER_TEXT = {
  scene_heading: "INT. LOCATION - DAY",
  action: "Describe what we see.",
  character: "CHARACTER NAME",
  dialogue: "Dialogue line.",
  parenthetical: "(beat)",
  transition: "CUT TO:"
}

const NEXT_ELEMENT = {
  scene_heading: "action",
  action: "action",
  character: "dialogue",
  dialogue: "character",
  parenthetical: "dialogue",
  transition: "scene_heading"
}

const ELEMENT_ORDER = [
  "scene_heading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition"
]

export default class extends Controller {
  static values = {
    savePath: String
  }

  static targets = ["content", "statusLight"]

  connect() {
    this.pendingSaveTimeout = null
    this.lastSavedSignature = this.currentAstSignature()
    this.setStatus("idle")
    this.boundSelectionChange = this.syncInsertTypeToSelection.bind(this)
    document.addEventListener("selectionchange", this.boundSelectionChange)
  }

  disconnect() {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout)
      this.pendingSaveTimeout = null
    }

    if (this.boundSelectionChange) {
      document.removeEventListener("selectionchange", this.boundSelectionChange)
      this.boundSelectionChange = null
    }
  }

  insertElement() {
    const select = this.element.querySelector("#insert-block-type")
    if (!select) return

    this.insertBlockAfterSelection(select.value)
  }

  handleKeydown(event) {
    const selection = window.getSelection()
    const currentBlock = selection && selection.rangeCount > 0
      ? this.findCurrentBlock(selection.getRangeAt(0))
      : null

    if (currentBlock && this.shouldReplacePlaceholder(currentBlock, event)) {
      event.preventDefault()
      this.replacePlaceholderText(currentBlock, event.key)
      return
    }

    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (!currentBlock) return

      event.preventDefault()
      const currentType = currentBlock.dataset.element || this.currentInsertType() || "action"
      const nextType = this.cycleElementType(currentType, event.shiftKey ? -1 : 1)
      this.applyElementType(currentBlock, nextType)
      this.queueSave()
      return
    }

    if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }

    if (!currentBlock) return

    event.preventDefault()

    const detectedType = this.detectElementType(currentBlock)
    if (detectedType) {
      this.applyElementType(currentBlock, detectedType)
    }

    const currentType = currentBlock.dataset.element || this.currentInsertType() || "action"
    const nextType = NEXT_ELEMENT[currentType] || "action"

    this.insertBlockAfterSelection(nextType)
    this.updateInsertType(nextType)
  }

  insertBlockAfterSelection(elementType) {
    const starterText = ELEMENT_STARTER_TEXT[elementType] || ""

    const p = document.createElement("p")
    p.dataset.element = elementType
    p.dataset.placeholder = starterText ? "true" : "false"
    p.textContent = starterText

    const sel = window.getSelection()
    let inserted = false

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const anchor = this.findCurrentBlock(range)
      if (anchor) {
        anchor.after(p)
        inserted = true
      }
    }

    if (!inserted) {
      this.contentTarget.appendChild(p)
    }

    this.focusBlockContents(p, { selectAll: true })
    this.contentTarget.focus()
    this.queueSave()
  }

  focusBlockContents(block, { selectAll = false } = {}) {
    const sel = window.getSelection()
    if (!sel) return

    const newRange = document.createRange()
    newRange.selectNodeContents(block)
    if (!selectAll) newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }

  currentInsertType() {
    const select = this.element.querySelector("#insert-block-type")
    return select?.value
  }

  updateInsertType(elementType) {
    const select = this.element.querySelector("#insert-block-type")
    if (select) select.value = elementType
  }

  applyElementType(block, elementType) {
    block.dataset.element = elementType
    this.updateInsertType(elementType)
  }

  cycleElementType(currentType, direction = 1) {
    const currentIndex = ELEMENT_ORDER.indexOf(currentType)
    const baseIndex = currentIndex >= 0 ? currentIndex : ELEMENT_ORDER.indexOf("action")
    const length = ELEMENT_ORDER.length
    const nextIndex = (baseIndex + direction + length) % length
    return ELEMENT_ORDER[nextIndex]
  }

  detectElementType(block) {
    const text = (block.innerText || block.textContent || "").trim()
    if (!text) return null

    if (/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/i.test(text)) {
      return "scene_heading"
    }

    if (text.startsWith("(")) {
      return "parenthetical"
    }

    if (/^(>|FADE OUT:|FADE IN:|CUT TO:|SMASH CUT TO:|MATCH CUT TO:)/i.test(text)) {
      return "transition"
    }

    if (text.length <= 30 && text === text.toUpperCase() && /[A-Z]/.test(text) && !/[.!?]/.test(text)) {
      return "character"
    }

    return null
  }

  shouldReplacePlaceholder(block, event) {
    if (!block || block.dataset.placeholder !== "true") return false
    if (event.ctrlKey || event.metaKey || event.altKey) return false
    if (event.key.length !== 1 && event.key !== "Backspace") return false

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return false
    const range = selection.getRangeAt(0)
    if (!range.collapsed && selection.toString().trim() === (block.textContent || "").trim()) return true

    const blockText = (block.textContent || "")
    return selection.toString() === blockText
  }

  replacePlaceholderText(block, key) {
    block.dataset.placeholder = "false"
    block.textContent = key === "Backspace" ? "" : key
    this.focusBlockContents(block)
    this.syncInsertTypeToSelection()
    this.queueSave()
  }

  syncInsertTypeToSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const block = this.findCurrentBlock(selection.getRangeAt(0))
    if (!block) return

    const elementType = block.dataset.element || "action"
    this.updateInsertType(elementType)
  }

  findCurrentBlock(range) {
    if (!range || !this.contentTarget.contains(range.commonAncestorContainer)) return null

    let anchor = range.commonAncestorContainer
    while (anchor && anchor !== this.contentTarget && anchor.parentNode !== this.contentTarget) {
      anchor = anchor.parentNode
    }

    return anchor && anchor !== this.contentTarget ? anchor : null
  }

  handleInput() {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const block = this.findCurrentBlock(selection.getRangeAt(0))
      if (block && (block.textContent || "").trim().length > 0) {
        block.dataset.placeholder = "false"
      }
    }

    this.queueSave()
  }

  queueSave() {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout)
    }

    this.setStatus("pending")
    this.pendingSaveTimeout = setTimeout(() => {
      this.pendingSaveTimeout = null
      this.save()
    }, SAVE_IDLE_MS)
  }

  async save() {
    if (!this.hasSavePathValue) return

    const contentAst = this.serializeContentAst()
    const signature = JSON.stringify(contentAst)

    if (signature === this.lastSavedSignature) {
      this.setStatus("idle")
      return
    }

    const content = this.astToPlainText(contentAst)

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      const response = await fetch(this.savePathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          document: {
            content,
            content_ast: contentAst
          }
        })
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(`HTTP ${response.status}: ${payload}`)
      }

      this.lastSavedSignature = signature
      this.setStatus("saved")
    } catch (error) {
      console.error("[doc-editor] failed to save document", error)
      this.setStatus("error")
    }
  }

  setStatus(state) {
    if (!this.hasStatusLightTarget) return

    this.statusLightTarget.dataset.state = state
  }

  currentAstSignature() {
    return JSON.stringify(this.serializeContentAst())
  }

  serializeContentAst() {
    const blocks = []
    const childNodes = Array.from(this.contentTarget.childNodes)
    const hasBlockElement = childNodes.some((node) => this.isBlockElement(node))

    if (hasBlockElement) {
      childNodes.forEach((node) => {
        if (this.isBlockElement(node)) {
          blocks.push(this.serializeParagraph(node))
        } else if (this.isIgnorableWhitespaceNode(node)) {
          return
        } else {
          if (blocks.length === 0) blocks.push(this.emptyParagraph())
          this.appendInlineNode(blocks[blocks.length - 1], node)
        }
      })
    } else {
      blocks.push(this.serializeParagraph(this.contentTarget))
    }

    return {
      type: "doc",
      version: 1,
      children: blocks.length > 0 ? blocks : [this.emptyParagraph()]
    }
  }

  serializeParagraph(sourceNode) {
    const paragraph = this.emptyParagraph()
    if (sourceNode.dataset && sourceNode.dataset.element) {
      paragraph.attrs = { element: sourceNode.dataset.element }
    }
    Array.from(sourceNode.childNodes).forEach((node) => this.appendInlineNode(paragraph, node))
    return paragraph
  }

  appendInlineNode(paragraph, node) {
    if (node.nodeType === Node.TEXT_NODE) {
      this.appendTextWithBreaks(paragraph, node.textContent || "")
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()

    if (tag === "br") {
      paragraph.children.push({ type: "hard_break" })
      return
    }

    if (tag === "div" || tag === "p") {
      this.appendTextWithBreaks(paragraph, node.innerText || node.textContent || "")
      return
    }

    Array.from(node.childNodes).forEach((child) => this.appendInlineNode(paragraph, child))
  }

  appendTextWithBreaks(paragraph, text) {
    const parts = text.split("\n")

    parts.forEach((part, index) => {
      if (part.length > 0) {
        paragraph.children.push({
          type: "text",
          text: part
        })
      }

      if (index < parts.length - 1) {
        paragraph.children.push({ type: "hard_break" })
      }
    })
  }

  astToPlainText(ast) {
    return ast.children.map((paragraph) => {
      if (!paragraph || paragraph.type !== "paragraph") return ""

      return paragraph.children.map((node) => {
        if (!node) return ""
        if (node.type === "text") return node.text || ""
        if (node.type === "hard_break") return "\n"
        return ""
      }).join("")
    }).join("\n")
  }

  emptyParagraph() {
    return { type: "paragraph", children: [] }
  }

  isBlockElement(node) {
    return node.nodeType === Node.ELEMENT_NODE && ["div", "p"].includes(node.tagName.toLowerCase())
  }

  isIgnorableWhitespaceNode(node) {
    return node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim() === ""
  }
}
