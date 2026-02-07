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
    ensure_two_shortcuts!
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

  def ensure_two_shortcuts!
    if Shortcut.count.zero?
      Shortcut.create!(
        label: "New Draft",
        thumbnail: "/icons/write.png",
        top: 82,
        left: 50
      )
    end

    return if Shortcut.count >= 2

    Shortcut.create!(
      label: "New Scene",
      thumbnail: "/icons/scene.png",
      top: 168,
      right: 84
    )
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
    Shortcut.order(created_at: :asc).limit(2).map do |shortcut|
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
