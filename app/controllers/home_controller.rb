class HomeController < ApplicationController
  NOTE_PRESENTATIONS = [
    { variant: "blue", width: "28rem", height: "12rem" },
    { variant: "yellow", width: "22rem", height: "10rem" }
  ].freeze

  def index
    ensure_demo_records!
    @notes = load_notes
    @desktop_shortcuts = load_shortcuts
  end

  def sandbox
    @sandbox_component = params[:id].to_s
  end

  private

  def ensure_demo_records!
    ensure_two_notes!
    ensure_default_shortcuts!
    ensure_document_shortcuts!
  end

  def ensure_two_notes!
    if Note.count.zero?
      Note.create!(
        title: "First Draft",
        content: "Open threads:\n- Character arc for Chapter 3\n- Final paragraph tone"
      )
    end

    return if Note.count >= 2

    Note.create!(
      title: "Scene Grid",
      content: "Scene 12: Dock at sunrise.\nObjective: reveal the hidden tape before breakfast rush.",
      top: 112,
      right: 96
    )
  end

  def ensure_default_shortcuts!
    Shortcut.where(document_id: nil).find_or_create_by!(label: "New Draft") do |shortcut|
      shortcut.thumbnail = "/icons/write.png"
      shortcut.top = 82
      shortcut.left = 50
    end

    Shortcut.where(document_id: nil).find_or_create_by!(label: "New Scene") do |shortcut|
      shortcut.thumbnail = "/icons/scene.png"
      shortcut.top = 168
      shortcut.right = 84
    end
  end

  def ensure_document_shortcuts!
    Document.includes(:shortcut).find_each do |document|
      document.create_desktop_shortcut! if document.shortcut.blank?
    end
  end

  def load_notes
    Note.order(created_at: :asc).limit(2).map.with_index do |note, index|
      presentation = NOTE_PRESENTATIONS[index] || NOTE_PRESENTATIONS.last

      {
        id: note.id,
        title: note.title,
        content: note.content,
        top: note.top,
        right: note.right,
        bottom: note.bottom,
        left: note.left,
        variant: presentation[:variant],
        width: presentation[:width],
        height: presentation[:height]
      }
    end
  end

  def load_shortcuts
    Shortcut.order(created_at: :asc).map do |shortcut|
      {
        id: shortcut.id,
        top: shortcut.top,
        right: shortcut.right,
        bottom: shortcut.bottom,
        left: shortcut.left,
        thumbnail: shortcut.thumbnail,
        label: shortcut.label
      }
    end
  end
end
