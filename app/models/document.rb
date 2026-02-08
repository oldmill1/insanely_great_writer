class Document < ApplicationRecord
  DOC_SHORTCUT_THUMBNAIL = "/icons/write.png".freeze
  FALLBACK_TITLE = "Untitled Document".freeze

  has_one :shortcut, dependent: :destroy

  after_commit :ensure_desktop_shortcut!, on: :create
  after_commit :sync_desktop_shortcut_label!, on: :update, if: :saved_change_to_title?

  def desktop_shortcut_label
    title.presence || FALLBACK_TITLE
  end

  def create_desktop_shortcut!
    return shortcut if shortcut.present?

    create_shortcut!(
      label: desktop_shortcut_label,
      thumbnail: DOC_SHORTCUT_THUMBNAIL,
      **Shortcut.next_grid_position
    )
  end

  private

  def ensure_desktop_shortcut!
    create_desktop_shortcut!
  end

  def sync_desktop_shortcut_label!
    return if shortcut.blank?

    shortcut.update!(label: desktop_shortcut_label)
  end
end
