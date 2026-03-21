class Folder < ApplicationRecord
  FOLDER_SHORTCUT_THUMBNAIL = "/icons/folders/default.png".freeze
  FALLBACK_NAME = "Untitled Folder".freeze

  include VirtualPathItem

  belongs_to :user
  has_one :shortcut, dependent: :destroy

  validates :name, presence: true

  after_commit :ensure_desktop_shortcut!, on: :create
  after_commit :sync_desktop_shortcut_label!, on: :update, if: :saved_change_to_name?

  def kind
    "folder"
  end

  def desktop_shortcut_label
    name.presence || FALLBACK_NAME
  end

  def create_desktop_shortcut!
    return unless root_level?
    return shortcut if shortcut.present?

    create_shortcut!(
      label: desktop_shortcut_label,
      thumbnail: FOLDER_SHORTCUT_THUMBNAIL,
      **Shortcut.next_grid_position
    )
  end

  private

  def ensure_desktop_shortcut!
    create_desktop_shortcut!
  end

  def sync_desktop_shortcut_label!
    return if shortcut.blank? || !root_level?

    shortcut.update!(label: desktop_shortcut_label)
  end
end
