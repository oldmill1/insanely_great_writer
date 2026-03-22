class Folder < ApplicationRecord
  FOLDER_SHORTCUT_THUMBNAIL = "/icons/folders/default.png".freeze
  FALLBACK_NAME = "Untitled Folder".freeze

  include VirtualPathItem

  belongs_to :user
  has_one :shortcut, dependent: :destroy
  scope :active, -> { where(is_deleted: false) }

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

  def soft_delete_tree!
    deleted_at = Time.current

    transaction do
      user.folders.where(path: subtree_paths).update_all(is_deleted: true, updated_at: deleted_at)
      user.documents.where(path: subtree_paths).update_all(is_deleted: true, updated_at: deleted_at)
    end
  end

  def rename_to!(next_name)
    normalized_name = next_name.to_s.strip
    old_path = path
    new_path = VirtualFilesystem.build_path(parent_path, normalized_name)

    transaction do
      update!(name: normalized_name, path: new_path)

      old_prefix = "#{old_path}/"
      new_prefix = "#{new_path}/"

      user.folders.active.where("path LIKE ?", "#{old_prefix}%").find_each do |folder|
        folder.update!(path: folder.path.sub(old_prefix, new_prefix))
      end

      user.documents.active.where("path LIKE ?", "#{old_prefix}%").find_each do |document|
        document.update!(path: document.path.sub(old_prefix, new_prefix))
      end
    end
  end

  private

  def subtree_paths
    prefix = "#{path}/"
    descendant_folder_paths = user.folders.where("path LIKE ?", "#{prefix}%").pluck(:path)
    descendant_document_paths = user.documents.where("path LIKE ?", "#{prefix}%").pluck(:path)

    [path, *descendant_folder_paths, *descendant_document_paths].uniq
  end

  def ensure_desktop_shortcut!
    create_desktop_shortcut!
  end

  def sync_desktop_shortcut_label!
    return if shortcut.blank? || !root_level?

    shortcut.update!(label: desktop_shortcut_label)
  end
end
