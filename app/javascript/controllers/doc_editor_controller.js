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

export default class extends Controller {
  static values = {
    savePath: String
  }

  static targets = ["content", "statusLight"]

  connect() {
    this.pendingSaveTimeout = null
    this.lastSavedSignature = this.currentAstSignature()
    this.setStatus("idle")
  }

  disconnect() {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout)
      this.pendingSaveTimeout = null
    }
  }

  insertElement() {
    const select = this.element.querySelector("#insert-block-type")
    if (!select) return

    const elementType = select.value
    const starterText = ELEMENT_STARTER_TEXT[elementType] || ""

    const p = document.createElement("p")
    p.dataset.element = elementType
    p.textContent = starterText

    const sel = window.getSelection()
    let inserted = false

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (this.contentTarget.contains(range.commonAncestorContainer)) {
        let anchor = range.commonAncestorContainer
        while (anchor && anchor !== this.contentTarget && anchor.parentNode !== this.contentTarget) {
          anchor = anchor.parentNode
        }
        if (anchor && anchor !== this.contentTarget) {
          anchor.after(p)
          inserted = true
        }
      }
    }

    if (!inserted) {
      this.contentTarget.appendChild(p)
    }

    const textNode = p.firstChild
    if (textNode) {
      const newRange = document.createRange()
      newRange.selectNodeContents(p)
      sel.removeAllRanges()
      sel.addRange(newRange)
    }

    this.contentTarget.focus()
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
