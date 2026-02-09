import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  activate() {
    document.querySelectorAll(".home__note.is-active").forEach((note) => {
      if (note !== this.element) {
        note.classList.remove("is-active")
      }
    })

    this.element.classList.add("is-active")
  }
}
