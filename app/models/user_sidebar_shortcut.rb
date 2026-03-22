class UserSidebarShortcut < ApplicationRecord
  DESKTOP_KIND = "desktop".freeze
  FOLDER_KIND = "folder".freeze
  DOCUMENT_KIND = "document".freeze
  DESKTOP_TARGET_KEY = "desktop".freeze
  DESKTOP_LABEL = "Desktop".freeze
  DESKTOP_THUMBNAIL = "/icons/folders/blue.png".freeze

  belongs_to :user

  validates :target_key, presence: true, uniqueness: { scope: :user_id }
  validates :item_kind, presence: true, inclusion: { in: [ DESKTOP_KIND, FOLDER_KIND, DOCUMENT_KIND ] }
  validates :label, presence: true
  validates :thumbnail, presence: true
  validates :position, presence: true
  validate :item_id_presence_matches_kind

  scope :ordered, -> { order(:position, :id) }

  def self.ensure_default_desktop_for(user)
    find_or_create_by!(user:, target_key: DESKTOP_TARGET_KEY) do |shortcut|
      shortcut.item_kind = DESKTOP_KIND
      shortcut.label = DESKTOP_LABEL
      shortcut.thumbnail = DESKTOP_THUMBNAIL
      shortcut.position = 0
    end
  end

  def self.next_position_for(user)
    user.user_sidebar_shortcuts.maximum(:position).to_i + 1
  end

  def desktop?
    item_kind == DESKTOP_KIND
  end

  def folder?
    item_kind == FOLDER_KIND
  end

  def document?
    item_kind == DOCUMENT_KIND
  end

  private

  def item_id_presence_matches_kind
    if desktop?
      errors.add(:item_id, "must be blank for desktop shortcuts") if item_id.present?
      return
    end

    errors.add(:item_id, "must be present for folder and document shortcuts") if item_id.blank?
  end
end
