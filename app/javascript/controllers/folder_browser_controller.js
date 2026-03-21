import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    folderId: Number,
    folderName: String,
    folderPath: String,
    createFolderPath: String,
    createDocumentPath: String,
    showPath: String
  }

  async createFolder() {
    await this.createItem(this.createFolderPathValue)
  }

  async createDocument() {
    await this.createItem(this.createDocumentPathValue)
  }

  openItem(event) {
    const row = event.currentTarget
    const itemKind = row.dataset.itemKind
    const itemId = row.dataset.itemId
    const itemName = row.dataset.itemName
    if (!itemKind || !itemId) return

    const desktopController = this.desktopController()
    if (!desktopController) return

    if (itemKind === "folder") {
      desktopController.openFolderWindow(itemId, itemName)
      return
    }

    desktopController.openDocumentWindow(itemId, itemName)
  }

  async createItem(path) {
    if (!path) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      credentials: "same-origin",
      body: JSON.stringify({ parent_path: this.folderPathValue })
    })

    if (!response.ok) return

    this.refreshFrame()
  }

  refreshFrame() {
    const frame = this.element.closest("turbo-frame")
    if (!frame) return

    frame.src = `${this.showPathValue}?frame_id=${encodeURIComponent(frame.id)}&refresh=${Date.now()}`
  }

  desktopController() {
    const desktopElement = document.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return null

    return this.application.getControllerForElementAndIdentifier(desktopElement, "desktop")
  }
}
